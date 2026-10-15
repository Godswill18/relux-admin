// ============================================================================
// ORDER STATUS — the one canonical definition for the admin/staff/delivery UI.
// Mirrors relux-laundry-backend-js/src/utils/orderStatus.js. Do not redeclare
// status unions or label maps in components; import from here.
//
// Delivery and pickup are NOT statuses: use deliveryStatus / actualPickupDate.
// Washing / ironing are not statuses either — they are In Progress.
// ============================================================================

export const ORDER_STATUSES = [
  'pending', 'confirmed', 'in_progress', 'ready', 'completed', 'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Retired values an old cache / client may still carry → canonical status.
const LEGACY: Record<string, OrderStatus> = {
  washing: 'in_progress',
  ironing: 'in_progress',
  out_for_delivery: 'ready',
  picked_up: 'confirmed',
  delivered: 'completed',
  inprogress: 'in_progress',
};

export function normalizeOrderStatus(value: unknown): OrderStatus | null {
  const k = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((ORDER_STATUSES as readonly string[]).includes(k)) return k as OrderStatus;
  return LEGACY[k] ?? null;
}

// Terminal = finished; reopening needs a supervisor (enforced by the backend).
export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled'];
export const isTerminalStatus = (s: unknown) =>
  TERMINAL_STATUSES.includes(normalizeOrderStatus(s) as OrderStatus);

// Forward / back steps for swipe and "advance" buttons.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed', confirmed: 'in_progress', in_progress: 'ready', ready: 'completed',
};
export const PREV_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'pending', in_progress: 'confirmed', ready: 'in_progress', completed: 'ready',
};
export const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, string>> = {
  pending: 'Confirm Order', confirmed: 'Start Processing', in_progress: 'Mark Ready', ready: 'Mark Completed',
};
