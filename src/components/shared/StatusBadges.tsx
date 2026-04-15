// ============================================================================
// STATUS BADGES - Shared, colour-consistent badge components
// Import from here instead of defining local badge helpers per page
// ============================================================================

import { Zap, Star, Flame } from 'lucide-react';
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

// ============================================================================
// PRIORITY BADGE — driven by priorityLevel (1-10) from ServiceLevelConfig
// 1-3: no badge (low, not shown)
// 4-6: amber  P{n}
// 7-8: orange P{n} + Zap icon
// 9-10: red   P{n} + Flame icon (critical)
// rush=true override → always red Flame (legacy support)
// ============================================================================

interface PriorityBadgeProps {
  serviceLevel?: string;
  rush?: boolean;
  priorityLevel?: number;
  /** 'icon' = icon only (tight tables); 'full' = icon + label (default) */
  variant?: 'icon' | 'full';
}

export function PriorityBadge({ serviceLevel, rush, priorityLevel, variant = 'full' }: PriorityBadgeProps) {
  // rush override (legacy) → always critical red
  if (rush) {
    return (
      <span
        title="Rush order"
        className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
      >
        <Flame className="h-3 w-3 shrink-0" />
        {variant === 'full' && 'Rush'}
      </span>
    );
  }

  // Numeric priority level
  if (priorityLevel && priorityLevel >= 1) {
    // 1-3 Low — don't render a badge
    if (priorityLevel <= 3) return null;

    // 4-6 Medium — amber
    if (priorityLevel <= 6) {
      return (
        <span
          title={`Priority ${priorityLevel} — Medium`}
          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
          {variant === 'full' && `P${priorityLevel}`}
          {variant === 'icon' && <Zap className="h-3 w-3 shrink-0" />}
        </span>
      );
    }

    // 7-8 High — orange + Zap
    if (priorityLevel <= 8) {
      return (
        <span
          title={`Priority ${priorityLevel} — High`}
          className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
        >
          <Zap className="h-3 w-3 shrink-0" />
          {variant === 'full' && `P${priorityLevel}`}
        </span>
      );
    }

    // 9-10 Critical — red + Flame
    return (
      <span
        title={`Priority ${priorityLevel} — Critical`}
        className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
      >
        <Flame className="h-3 w-3 shrink-0" />
        {variant === 'full' && `P${priorityLevel}`}
      </span>
    );
  }

  // Legacy string-based fallback (no priorityLevel set yet)
  const level = (serviceLevel || '').toLowerCase();

  if (level === 'express') {
    return (
      <span
        title="Express service"
        className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      >
        <Zap className="h-3 w-3 shrink-0" />
        {variant === 'full' && 'Express'}
      </span>
    );
  }

  if (level === 'premium') {
    return (
      <span
        title="Premium service"
        className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      >
        <Star className="h-3 w-3 shrink-0 fill-purple-500" />
        {variant === 'full' && 'Premium'}
      </span>
    );
  }

  return null;
}
