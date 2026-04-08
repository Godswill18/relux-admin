// ============================================================================
// STAFF PRODUCTIVITY CHART - Comprehensive per-staff performance dashboard
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
  User,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  CalendarDays,
  ClipboardList,
  ShoppingBag,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });
}

function roleColor(role: string) {
  switch (role) {
    case 'admin':       return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'manager':     return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'receptionist': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:            return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }
}

function completionColor(rate: number) {
  if (rate >= 80) return 'text-green-600 dark:text-green-400';
  if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

// ── Stat chip ────────────────────────────────────────────────────────────────

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  className = '',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </div>
      <p className="font-semibold text-sm leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({ s }: { s: any }) {
  const attendanceRate =
    s.shiftsWorked > 0 ? Math.round((s.attendanceCount / s.shiftsWorked) * 100) : 0;

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-full bg-muted shrink-0">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{s.name || 'Unknown'}</p>
            {s.email && (
              <p className="text-xs text-muted-foreground truncate">{s.email}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${roleColor(s.role)}`}>
          {s.role}
        </span>
      </div>

      {/* Completion rate bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Completion Rate</span>
          <span className={`font-semibold ${completionColor(s.completionRate)}`}>
            {s.completionRate}%
          </span>
        </div>
        <Progress value={s.completionRate} className="h-1.5" />
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Package}       label="Assigned"   value={s.orderCount} />
        <Stat icon={CheckCircle}   label="Completed"  value={s.completedOrders} />
        <Stat icon={TrendingUp}    label="Revenue"    value={formatCurrency(s.totalRevenue)} />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1 border-t">
        <Stat icon={ClipboardList} label="Updates"    value={s.statusUpdates}  sub="status changes" />
        <Stat icon={ShoppingBag}   label="Walk-ins"   value={s.walkinOrders}   sub="created" />
        <Stat icon={CalendarDays}  label="Shifts"     value={s.shiftsWorked}   sub="worked" />
      </div>

      {/* Attendance */}
      {s.shiftsWorked > 0 && (
        <div className="space-y-1 pt-1 border-t">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Attendance</span>
            <span className={`font-semibold ${completionColor(attendanceRate)}`}>
              {attendanceRate}% ({s.attendanceCount}/{s.shiftsWorked})
            </span>
          </div>
          <Progress value={attendanceRate} className="h-1.5" />
          {s.lateCount > 0 && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {s.lateCount} late clock-in{s.lateCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Order status mini-summary */}
      <div className="flex flex-wrap gap-2 text-xs pt-1 border-t">
        {s.inProgressOrders > 0 && (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3" />{s.inProgressOrders} in progress
          </span>
        )}
        {s.cancelledOrders > 0 && (
          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
            <XCircle className="w-3 h-3" />{s.cancelledOrders} cancelled
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StaffProductivityChart() {
  const { staffProductivity, isLoading, fetchStaffProductivity } = useAnalyticsStore();

  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const load = useCallback(() => {
    const params: { startDate?: string; endDate?: string } = {};
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    fetchStaffProductivity(params);
  }, [startDate, endDate, fetchStaffProductivity]);

  // Reload when dates change
  useEffect(() => { load(); }, [load]);

  const clearDates = () => { setStartDate(''); setEndDate(''); };
  const hasDate = !!(startDate || endDate);

  const data = Array.isArray(staffProductivity) ? staffProductivity : [];

  // Summary totals
  const totals = data.reduce(
    (acc, s) => ({
      orders:   acc.orders   + s.orderCount,
      revenue:  acc.revenue  + s.totalRevenue,
      updates:  acc.updates  + s.statusUpdates,
      walkins:  acc.walkins  + s.walkinOrders,
    }),
    { orders: 0, revenue: 0, updates: 0, walkins: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {hasDate && (
          <Button variant="ghost" size="sm" onClick={clearDates} className="h-8 px-2 shrink-0" title="Clear filter">
            <X className="w-4 h-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={load} className="h-8 gap-1 shrink-0">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {hasDate && (
        <p className="text-xs text-primary">
          Showing {startDate && `from ${startDate}`}{startDate && endDate && ' '}
          {endDate && `to ${endDate}`}
        </p>
      )}

      {/* Summary bar */}
      {data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg text-sm">
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Orders</p>
            <p className="font-bold text-base">{totals.orders}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Total Revenue</p>
            <p className="font-bold text-base">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Status Updates</p>
            <p className="font-bold text-base">{totals.updates}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Walk-ins Created</p>
            <p className="font-bold text-base">{totals.walkins}</p>
          </div>
        </div>
      )}

      {/* Grid of staff cards */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Loading staff data…
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-2">
          <User className="w-10 h-10 opacity-40" />
          <p>No staff performance data found</p>
          {hasDate && (
            <Button variant="ghost" size="sm" onClick={clearDates} className="text-xs">
              Clear date filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s: any) => (
            <StaffCard key={s._id} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}
