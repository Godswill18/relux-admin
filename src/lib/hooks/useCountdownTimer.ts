import { useState, useEffect, useRef } from 'react';

export type TimerUrgency = 'green' | 'yellow' | 'red';

export interface CountdownResult {
  /** Remaining milliseconds (negative when overdue) */
  remaining: number;
  /** True once deadline has passed */
  isOverdue: boolean;
  /** Color urgency: green > 50 %, yellow 20–50 %, red < 20 % or overdue */
  urgency: TimerUrgency;
  /** Formatted string like "1h 23m" or "45s" */
  display: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) {
    const elapsed = Math.abs(ms);
    const h = Math.floor(elapsed / 3_600_000);
    const m = Math.floor((elapsed % 3_600_000) / 60_000);
    const s = Math.floor((elapsed % 60_000) / 1_000);
    if (h > 0) return `+${h}h ${m}m ${s}s overdue`;
    if (m > 0) return `+${m}m ${s}s overdue`;
    return `+${s}s overdue`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Real-time countdown timer hook.
 * @param stageDeadlineAt  ISO date string (or null) from the order
 * @param stageDurationMinutes  Total duration for the stage (used to compute urgency %)
 */
export function useCountdownTimer(
  stageDeadlineAt: string | Date | null | undefined,
  stageDurationMinutes: number | null | undefined
): CountdownResult | null {
  const deadlineMs = stageDeadlineAt ? new Date(stageDeadlineAt).getTime() : null;
  const totalMs = stageDurationMinutes ? stageDurationMinutes * 60 * 1000 : null;

  const [remaining, setRemaining] = useState<number>(() =>
    deadlineMs ? deadlineMs - Date.now() : 0
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!deadlineMs) return;

    const tick = () => setRemaining(deadlineMs - Date.now());
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [deadlineMs]);

  if (!deadlineMs) return null;

  const isOverdue = remaining <= 0;
  let urgency: TimerUrgency = 'green';
  if (isOverdue) {
    urgency = 'red';
  } else if (totalMs) {
    const pct = remaining / totalMs;
    if (pct < 0.2) urgency = 'red';
    else if (pct < 0.5) urgency = 'yellow';
  }

  return {
    remaining,
    isOverdue,
    urgency,
    display: formatRemaining(remaining),
  };
}
