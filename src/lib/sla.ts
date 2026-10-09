// Service SLA — client side.
//
// The server decides every deadline (confirmedAt, slaDueAt, readyAt). This file
// only (1) keeps a clock offset against the server so a wrong device clock
// cannot change what is shown, and (2) turns the server's `sla` payload into
// display values. It never computes a deadline from hours or from Date.now().

export type SlaState =
  | 'not_started' | 'unavailable' | 'stopped'
  | 'running' | 'due_soon' | 'overdue' | 'on_time' | 'completed_late';

export interface SlaView {
  serverTime: string;
  dueSoonFraction: number;
  available: boolean;
  state: SlaState;
  /** The order's service level (Standard / Express / Premium Express …) — the source of the timer. */
  serviceLevel?: string | null;
  serviceLevelId?: string | null;
  /** Processing hours snapshotted from the service level at confirmation. */
  hours?: number;
  startedAt?: string;
  confirmedAt?: string | null;
  dueAt?: string;
  estimatedCompletionAt?: string;
  readyAt?: string | null;
  isOverdue?: boolean;
}

// ── Server clock ─────────────────────────────────────────────────────────
let offsetMs = 0;
const listeners = new Set<() => void>();

/** Record a server timestamp seen "now"; later readings overwrite earlier ones. */
export function syncServerClock(serverTime?: string | null) {
  if (!serverTime) return;
  const t = Date.parse(serverTime);
  if (Number.isNaN(t)) return;
  const next = t - Date.now();
  if (Math.abs(next - offsetMs) < 250) return; // network jitter, not a real change
  offsetMs = next;
  listeners.forEach((l) => l());
}

/** Server-corrected "now" in ms. */
export const serverNow = () => Date.now() + offsetMs;
export const getClockOffset = () => offsetMs;
export const onClockChange = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** Pull a serverTime out of any API response body we recognise. */
export function syncFromBody(body: any) {
  const d = body?.data;
  const t = d?.serverTime || d?.order?.sla?.serverTime || body?.serverTime || d?.sla?.serverTime;
  if (t) syncServerClock(t);
}

let reconcileTimer: ReturnType<typeof setInterval> | null = null;
/** Re-check the server clock every few minutes, without any server broadcast. */
export function startClockReconcile(healthUrl: string, everyMs = 5 * 60 * 1000) {
  if (reconcileTimer) return;
  const run = async () => {
    try {
      const r = await fetch(healthUrl, { cache: 'no-store' });
      const j = await r.json();
      syncServerClock(j?.timestamp);
    } catch { /* offline: keep the last offset */ }
  };
  run();
  reconcileTimer = setInterval(run, everyMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
}

// ── Formatting ───────────────────────────────────────────────────────────
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return abs < 600_000 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

export interface SlaDisplay {
  state: SlaState;
  /** 0–100, capped. Overdue time is reported separately. */
  percent: number;
  remainingMs: number;
  overdueMs: number;
  /** "8h 10m remaining" / "Overdue by 1h 5m" / "Ready on time" … */
  label: string;
  /** Short list form: "8h left" / "Due in 45m" / "OVERDUE 1h" */
  short: string;
  tone: 'neutral' | 'green' | 'amber' | 'red' | 'blue';
}

function stateFor(due: number, start: number, fraction: number, now: number): SlaState {
  if (now > due) return 'overdue';
  return due - now <= (due - start) * fraction ? 'due_soon' : 'running';
}

/** Display values for one deadline window at a given (server-corrected) time. */
export function describeWindow(
  startedAt: string, dueAt: string, readyAt: string | null | undefined, fraction: number, now = serverNow()
): SlaDisplay {
  const start = Date.parse(startedAt), due = Date.parse(dueAt);
  if (readyAt) {
    const late = Date.parse(readyAt) > due;
    return {
      state: late ? 'completed_late' : 'on_time', percent: 100, remainingMs: 0,
      overdueMs: late ? Date.parse(readyAt) - due : 0,
      label: 'Ready for collection', short: late ? 'Ready (late)' : 'Ready',
      tone: late ? 'amber' : 'green',
    };
  }
  const total = Math.max(due - start, 1);
  const percent = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const state = stateFor(due, start, fraction, now);
  if (state === 'overdue') {
    const over = now - due;
    return { state, percent: 100, remainingMs: 0, overdueMs: over, label: `Overdue by ${formatDuration(over)}`, short: `OVERDUE ${formatDuration(over)}`, tone: 'red' };
  }
  const remaining = due - now;
  return {
    state, percent, remainingMs: remaining, overdueMs: 0,
    label: `${formatDuration(remaining)} remaining`,
    short: remaining < 3_600_000 ? `Due in ${formatDuration(remaining)}` : `${formatDuration(remaining)} left`,
    tone: state === 'due_soon' ? 'amber' : 'blue',
  };
}

/** Whole-order display. Returns null when there is nothing SLA-based to show. */
export function describeSla(sla: SlaView | null | undefined, now = serverNow()): SlaDisplay | null {
  if (!sla) return null;
  if (sla.state === 'not_started') {
    return { state: 'not_started', percent: 0, remainingMs: 0, overdueMs: 0, label: 'Timer starts once the order is confirmed', short: 'Not started', tone: 'neutral' };
  }
  if (!sla.available || !sla.startedAt || !sla.dueAt) return null;
  const readyAt = sla.readyAt || null;
  return describeWindow(sla.startedAt, sla.dueAt, readyAt, sla.dueSoonFraction, now);
}

export const toneClasses: Record<SlaDisplay['tone'], string> = {
  neutral: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/40 dark:text-gray-300 dark:border-gray-700',
  green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900',
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
};
export const toneBar: Record<SlaDisplay['tone'], string> = {
  neutral: 'bg-gray-300', green: 'bg-green-500', blue: 'bg-blue-500', amber: 'bg-amber-500', red: 'bg-red-500',
};

export function formatDue(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
