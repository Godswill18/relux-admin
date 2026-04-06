import { Clock, AlertTriangle } from 'lucide-react';
import { useCountdownTimer } from '@/lib/hooks/useCountdownTimer';
import { cn } from '@/lib/utils';

interface CountdownBadgeProps {
  stageDeadlineAt: string | Date | null | undefined;
  stageDurationMinutes: number | null | undefined;
  /** compact = single-line pill for table rows; full = larger card-style */
  variant?: 'compact' | 'full';
  className?: string;
}

export function CountdownBadge({
  stageDeadlineAt,
  stageDurationMinutes,
  variant = 'compact',
  className,
}: CountdownBadgeProps) {
  const timer = useCountdownTimer(stageDeadlineAt, stageDurationMinutes);

  if (!timer) return null;

  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }[timer.urgency];

  const iconColorClasses = {
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
  }[timer.urgency];

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
          colorClasses,
          className
        )}
      >
        {timer.isOverdue ? (
          <AlertTriangle className={cn('h-3 w-3', iconColorClasses)} />
        ) : (
          <Clock className={cn('h-3 w-3', iconColorClasses)} />
        )}
        {timer.display}
      </span>
    );
  }

  // full variant
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4',
        colorClasses,
        className
      )}
    >
      <div className={cn('rounded-full p-2', timer.urgency === 'red' ? 'bg-red-100' : timer.urgency === 'yellow' ? 'bg-yellow-100' : 'bg-green-100')}>
        {timer.isOverdue ? (
          <AlertTriangle className={cn('h-5 w-5', iconColorClasses)} />
        ) : (
          <Clock className={cn('h-5 w-5', iconColorClasses)} />
        )}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">
          {timer.isOverdue ? 'Stage Overdue' : 'Time Remaining'}
        </p>
        <p className="text-lg font-bold">{timer.display}</p>
      </div>
    </div>
  );
}
