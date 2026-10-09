import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSlaNow } from '@/lib/useSlaClock';
import { describeSla, formatDue, toneBar, toneClasses, type SlaView, type SlaDisplay } from '@/lib/sla';

const StateIcon = ({ d, className }: { d: SlaDisplay; className?: string }) => {
  if (d.state === 'overdue') return <AlertTriangle className={className} />;
  if (d.state === 'on_time' || d.state === 'completed_late') return <CheckCircle2 className={className} />;
  return <Clock className={className} />;
};

/**
 * The one processing timer. One deadline per order, set by its service level
 * when the order was confirmed. Renders only what the server sent: the clock is
 * server-corrected and nothing here changes a status.
 */
export function OrderTimer({
  sla,
  variant = 'compact',
  audience = 'staff',
  garments,
  className,
}: {
  sla: SlaView | null | undefined;
  variant?: 'compact' | 'full';
  audience?: 'staff' | 'customer';
  /** Optional garment progress, e.g. { ready: 7, total: 10 } */
  garments?: { ready: number; total: number } | null;
  className?: string;
}) {
  const now = useSlaNow(variant === 'compact' ? 30_000 : 1000);
  const raw = describeSla(sla, now);
  if (!sla || !raw) return null;
  // Customers are told about a delay gently; staff see the exact overrun.
  const d: SlaDisplay = audience === 'customer' && raw.state === 'overdue'
    ? { ...raw, label: 'Your order is taking slightly longer than the estimated completion time.', short: 'Slightly delayed' }
    : raw;

  if (variant === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', toneClasses[d.tone], className)}>
        <StateIcon d={d} className="h-3 w-3" />
        {d.short}
      </span>
    );
  }

  if (d.state === 'not_started') {
    return (
      <div className={cn('rounded-lg border p-4 text-sm', toneClasses.neutral, className)}>
        <p className="font-medium">
          {audience === 'customer' ? 'Processing timer will begin once your order is confirmed.' : 'Timer starts once the order is confirmed.'}
        </p>
        {sla.serviceLevel && <p className="mt-0.5 text-xs opacity-80">Service level: {sla.serviceLevel}</p>}
      </div>
    );
  }

  const finished = d.state === 'on_time' || d.state === 'completed_late';
  const partial = !finished && garments && garments.total > 0 && garments.ready > 0 && garments.ready < garments.total;

  return (
    <div className={cn('rounded-lg border p-4', toneClasses[d.tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-full bg-white/60 p-2 dark:bg-white/10"><StateIcon d={d} className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">
              {finished ? 'Ready for collection' : audience === 'customer' ? 'Estimated completion' : 'Due'}
            </p>
            <p className="text-lg font-bold">{finished ? `Completed ${formatDue(sla.readyAt)}` : formatDue(sla.dueAt)}</p>
          </div>
        </div>
        {!finished && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide opacity-70">{d.state === 'overdue' ? (audience === 'customer' ? 'Update' : 'Overdue') : 'Remaining'}</p>
            <p className={cn('font-semibold', audience === 'customer' && d.state === 'overdue' ? 'max-w-[14rem] text-xs' : 'text-sm')}>
              {d.state === 'overdue' && audience !== 'customer' ? d.label.replace('Overdue by ', '') : d.label.replace(' remaining', '')}
            </p>
          </div>
        )}
      </div>

      {!finished && (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-white/10" role="progressbar" aria-valuenow={Math.round(d.percent)} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn('h-full rounded-full transition-all', toneBar[d.tone])} style={{ width: `${d.percent}%` }} />
          </div>
          {partial && (
            <p className="mt-2 text-xs font-medium">{garments!.ready} of {garments!.total} garments ready</p>
          )}
        </>
      )}

      <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-[11px] opacity-75">
        <span>{sla.serviceLevel ? `${sla.serviceLevel}${sla.hours ? ` · ${sla.hours}h` : ''}` : ''}</span>
        <span>Confirmed {formatDue(sla.confirmedAt)}</span>
      </div>
    </div>
  );
}

/**
 * Drop-in for any order row/card/detail. Shows the service-level timer when the
 * order has one. Legacy orders (confirmed before the timer existed) show none —
 * the old per-stage countdown restarted on every progress change and is retired.
 */
export function OrderTimerAuto({
  order,
  variant = 'compact',
  className,
}: {
  order: { sla?: SlaView | null; fulfilment?: { readyGarments?: number; totalGarments?: number } | null };
  variant?: 'compact' | 'full';
  className?: string;
}) {
  const sla = order.sla;
  if (!sla || !(sla.available || sla.state === 'not_started')) return null;
  if (variant === 'compact' && sla.state === 'not_started') return null;
  const f = order.fulfilment;
  const garments = f && f.totalGarments ? { ready: f.readyGarments || 0, total: f.totalGarments } : null;
  return <OrderTimer sla={sla} variant={variant} garments={garments} className={className} />;
}
