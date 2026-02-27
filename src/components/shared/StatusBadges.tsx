// ============================================================================
// STATUS BADGES - Shared, colour-consistent badge components
// Import from here instead of defining local badge helpers per page
// ============================================================================

import {
  getOrderStatusConfig,
  getPaymentStatusConfig,
  getActiveStatusConfig,
  getCustomerAccountStatusConfig,
  getSubscriptionStatusConfig,
  getPlanActiveConfig,
} from '@/lib/statusConfig';

// ============================================================================
// BASE PILL
// ============================================================================

function StatusPill({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// ORDER STATUS BADGE
// ============================================================================

export function OrderStatusBadge({ status }: { status: string }) {
  const cfg = getOrderStatusConfig(status);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}

// ============================================================================
// PAYMENT STATUS BADGE
// ============================================================================

export function PaymentStatusBadge({ status }: { status: string }) {
  const cfg = getPaymentStatusConfig(status);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}

// ============================================================================
// CUSTOMER ACTIVE STATUS  (isActive boolean on User)
// ============================================================================

export function CustomerActiveBadge({ isActive }: { isActive?: boolean }) {
  const cfg = getActiveStatusConfig(isActive);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}

// ============================================================================
// CUSTOMER ACCOUNT STATUS  (customerId.status string field)
// ============================================================================

export function CustomerAccountStatusBadge({ status }: { status: string }) {
  const cfg = getCustomerAccountStatusConfig(status);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}

// ============================================================================
// SUBSCRIPTION STATUS BADGE
// ============================================================================

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const cfg = getSubscriptionStatusConfig(status);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}

// ============================================================================
// PLAN ACTIVE BADGE  (boolean)
// ============================================================================

export function PlanActiveBadge({ active }: { active?: boolean }) {
  const cfg = getPlanActiveConfig(active);
  return <StatusPill className={cfg.className} label={cfg.label} />;
}
