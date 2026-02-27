// ============================================================================
// TOAST - Unified notification helper
//
// Usage:
//   import { toast } from '@/lib/toast';
//   toast.success('Saved!');
//   toast.error('Something went wrong', 'Please try again');
//   toast.warning('Low balance', 'Wallet below ₦500');
//   toast.info('Tip', 'You can filter orders by status');
//
// Design system:
//   success  → bg-green-600  white text
//   error    → bg-red-600    white text
//   warning  → bg-orange-500 black text
//   info     → bg-blue-600   white text
//   default  → bg-gray-700   white text
//
// Deduplication:
//   Toasts with the same message are collapsed into a single notification.
//   Identical calls within the same 4-second window update the existing toast
//   rather than stacking new ones.
// ============================================================================

import {
  toast as sonnerToast,
  type ExternalToast,
  type ToastT,
} from 'sonner';

type Message = string;
type Options = Omit<ExternalToast, 'id'>;

/** Derive a stable ID from the first 60 chars of the message. */
function id(msg: Message): string {
  return msg.trim().slice(0, 60);
}

export const toast = {
  /** Green — action completed successfully */
  success(message: Message, description?: string, opts?: Options): string | number {
    return sonnerToast.success(message, { id: id(message), description, ...opts });
  },

  /** Red — action failed or an error occurred */
  error(message: Message, description?: string, opts?: Options): string | number {
    return sonnerToast.error(message, { id: id(message), description, ...opts });
  },

  /** Orange — action may have side-effects or needs user attention */
  warning(message: Message, description?: string, opts?: Options): string | number {
    return sonnerToast.warning(message, { id: id(message), description, ...opts });
  },

  /** Blue — neutral informational message */
  info(message: Message, description?: string, opts?: Options): string | number {
    return sonnerToast.info(message, { id: id(message), description, ...opts });
  },

  /** Gray — generic / uncategorised message */
  default(message: Message, description?: string, opts?: Options): string | number {
    return sonnerToast(message, { id: id(message), description, ...opts });
  },

  /** Show a loading toast, then update it via the returned id */
  loading(message: Message, opts?: Options): string | number {
    return sonnerToast.loading(message, { id: id(message), ...opts });
  },

  /** Wrap an async operation: loading → success / error */
  promise: sonnerToast.promise as typeof sonnerToast.promise,

  /** Dismiss a specific toast or all toasts */
  dismiss(toastId?: string | number): void {
    sonnerToast.dismiss(toastId);
  },
} as const;

// Also re-export the raw sonner toast for advanced use cases
// (e.g. custom JSX toasts, action buttons, etc.)
export { sonnerToast };
export type { ToastT, ExternalToast };
