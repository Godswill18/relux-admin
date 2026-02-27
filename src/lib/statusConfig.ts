// ============================================================================
// STATUS CONFIG - Single source of truth for all status colors
// Used by: Dashboard charts, OrdersPage, OrderDetailPage,
//          CustomersPage, TransactionsTab, SubscriptionsPage
// ============================================================================

export interface StatusConfig {
  label: string;
  /** Tailwind className for badge pills */
  className: string;
  /** Hex value for recharts cells / dot indicators */
  hex: string;
}

// ============================================================================
// ORDER STATUS
// ============================================================================

export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    hex: '#f59e0b',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    hex: '#3b82f6',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  'pending-pickup': {
    label: 'Pending Pickup',
    hex: '#8b5cf6',
    className:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400',
  },
  'picked-up': {
    label: 'Picked Up',
    hex: '#8b5cf6',
    className:
      'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400',
  },
  in_progress: {
    label: 'In Progress',
    hex: '#6366f1',
    className:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  washing: {
    label: 'Washing',
    hex: '#06b6d4',
    className:
      'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  ironing: {
    label: 'Ironing',
    hex: '#0ea5e9',
    className:
      'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400',
  },
  ready: {
    label: 'Ready',
    hex: '#10b981',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  'out-for-delivery': {
    label: 'Out for Delivery',
    hex: '#f97316',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  },
  delivered: {
    label: 'Delivered',
    hex: '#22c55e',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  completed: {
    label: 'Completed',
    hex: '#16a34a',
    className:
      'bg-green-200 text-green-900 border-green-300 dark:bg-green-900/50 dark:text-green-300',
  },
  cancelled: {
    label: 'Cancelled',
    hex: '#ef4444',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  draft: {
    label: 'Draft',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  },
};

export const ORDER_STATUS_FALLBACK: StatusConfig = {
  label: 'Unknown',
  hex: '#94a3b8',
  className:
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
};

export function getOrderStatusConfig(status: string): StatusConfig {
  return ORDER_STATUS_CONFIG[status?.toLowerCase?.()] ?? {
    ...ORDER_STATUS_FALLBACK,
    label: status || 'Unknown',
  };
}

// ============================================================================
// PAYMENT STATUS
// ============================================================================

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    hex: '#f59e0b',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  unpaid: {
    label: 'Unpaid',
    hex: '#f59e0b',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  confirmed: {
    label: 'Confirmed',
    hex: '#3b82f6',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  paid: {
    label: 'Paid',
    hex: '#16a34a',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  partial: {
    label: 'Partial',
    hex: '#f97316',
    className:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  },
  failed: {
    label: 'Failed',
    hex: '#ef4444',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  refunded: {
    label: 'Refunded',
    hex: '#8b5cf6',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

export function getPaymentStatusConfig(status: string): StatusConfig {
  return PAYMENT_STATUS_CONFIG[status?.toLowerCase?.()] ?? {
    label: status || 'Unknown',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  };
}

// ============================================================================
// CUSTOMER ACCOUNT STATUS  (customerId.status field)
// ============================================================================

export const CUSTOMER_ACCOUNT_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    hex: '#16a34a',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  guest: {
    label: 'Guest',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  },
  suspended: {
    label: 'Suspended',
    hex: '#ef4444',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
};

/** For the isActive boolean on User documents */
export function getActiveStatusConfig(isActive?: boolean): StatusConfig {
  return isActive === false
    ? {
        label: 'Inactive',
        hex: '#94a3b8',
        className:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      }
    : {
        label: 'Active',
        hex: '#16a34a',
        className:
          'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
      };
}

export function getCustomerAccountStatusConfig(status: string): StatusConfig {
  return CUSTOMER_ACCOUNT_STATUS_CONFIG[status?.toLowerCase?.()] ?? {
    label: status || 'Unknown',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  };
}

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

export const SUBSCRIPTION_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: {
    label: 'Active',
    hex: '#16a34a',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  paused: {
    label: 'Paused',
    hex: '#f59e0b',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  cancelled: {
    label: 'Cancelled',
    hex: '#ef4444',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  expired: {
    label: 'Expired',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  },
};

/** Plan active / inactive boolean */
export function getPlanActiveConfig(active?: boolean): StatusConfig {
  return active !== false
    ? {
        label: 'Active',
        hex: '#16a34a',
        className:
          'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400',
      }
    : {
        label: 'Inactive',
        hex: '#94a3b8',
        className:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
      };
}

export function getSubscriptionStatusConfig(status: string): StatusConfig {
  return SUBSCRIPTION_STATUS_CONFIG[status?.toLowerCase?.()] ?? {
    label: status || 'Unknown',
    hex: '#94a3b8',
    className:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  };
}
