// ============================================================================
// STAFF PERFORMANCE PAGE - Order Completion · Cycle Time · Revenue
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, Clock, TrendingUp, Zap, Target, Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import {
  format, subDays, startOfDay, differenceInMinutes,
  eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks,
} from 'date-fns';

// ============================================================================
// CHART COLOR PALETTE  (hardcoded — CSS vars don't work in SVG attributes)
// ============================================================================

const COLORS = {
  primary:   '#6366f1',   // indigo
  secondary: '#22c55e',   // green
  bar1:      '#6366f1',   // indigo
  bar2:      '#94a3b8',   // slate
  grid:      '#e2e8f0',   // light border
  axis:      '#94a3b8',   // muted text
};

// ============================================================================
// TYPES
// ============================================================================

interface CompletedOrder {
  _id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  pricing?: { total: number };
  total?: number;
  statusHistory?: Array<{ status: string; timestamp: string }>;
  items?: Array<{ serviceType?: string; quantity: number }>;
  walkInCustomer?: { name?: string };
  customer?: { name?: string };
}

// ============================================================================
// HELPERS
// ============================================================================

// Both 'completed' and 'delivered' count as terminal states for performance tracking
const TERMINAL = ['completed', 'delivered'];

function getCompletedAt(order: CompletedOrder): Date {
  const hist = order.statusHistory ?? [];
  const entry = [...hist].reverse().find((h) => TERMINAL.includes(h.status));
  return entry ? new Date(entry.timestamp) : new Date(order.updatedAt);
}

function getCycleMinutes(order: CompletedOrder): number {
  const start = new Date(order.createdAt);
  const end   = getCompletedAt(order);
  return Math.max(0, differenceInMinutes(end, start));
}

function formatCycleTime(minutes: number): string {
  if (minutes === 0) return '—';
  if (minutes < 60)  return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function orderRevenue(order: CompletedOrder): number {
  return order.pricing?.total ?? order.total ?? 0;
}

function customerName(order: CompletedOrder): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}

function serviceLabel(order: CompletedOrder): string {
  const types = [
    ...new Set(
      (order.items ?? []).map((i) => i.serviceType).filter(Boolean) as string[]
    ),
  ];
  if (types.length === 0) return '—';
  return types.map((s) => s.replace(/-/g, ' ')).join(', ');
}

// ============================================================================
// CUSTOM TOOLTIPS
// ============================================================================

function DailyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'revenue'
            ? `Revenue: ₦${Number(p.value).toLocaleString()}`
            : `Completed: ${p.value} order${p.value !== 1 ? 's' : ''}`}
        </p>
      ))}
    </div>
  );
}

function CycleTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold">Week of {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'avgCycleHours'
            ? `Avg Time: ${formatCycleTime(Math.round(p.value * 60))}`
            : `Orders: ${p.value}`}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

type Period = '7' | '30' | '90';

export default function StaffPerformancePage() {
  const [orders, setOrders]       = useState<CompletedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod]       = useState<Period>('30');

  // ── Fetch all completed orders for this staff ──────────────────────────

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      // tab=completed → backend $or: [assignedStaff=me, createdByStaff=me] + status=completed
      const res = await apiClient.get('/orders', {
        params: { tab: 'completed', limit: 200 },
      });
      const raw: CompletedOrder[] = res.data.data?.orders ?? res.data.data ?? [];
      setOrders(raw);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Filter by selected period ──────────────────────────────────────────

  const cutoff   = startOfDay(subDays(new Date(), Number(period)));
  const filtered = orders.filter((o) => getCompletedAt(o) >= cutoff);

  // ── Stats ──────────────────────────────────────────────────────────────

  const totalCompleted  = filtered.length;
  const totalRevenue    = filtered.reduce((s, o) => s + orderRevenue(o), 0);
  const cycleMins       = filtered.map(getCycleMinutes);
  const avgCycleMinutes = cycleMins.length
    ? Math.round(cycleMins.reduce((a, b) => a + b, 0) / cycleMins.length)
    : 0;
  const fastestMinutes  = cycleMins.length ? Math.min(...cycleMins) : 0;

  // ── Daily chart data ───────────────────────────────────────────────────

  const days = eachDayOfInterval({ start: cutoff, end: new Date() });
  const dailyData = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd   = new Date(dayStart.getTime() + 86_400_000 - 1);
    const dayOrds  = filtered.filter((o) => {
      const d = getCompletedAt(o);
      return d >= dayStart && d <= dayEnd;
    });
    return {
      date:    format(day, days.length <= 14 ? 'EEE d' : 'MMM d'),
      orders:  dayOrds.length,
      revenue: dayOrds.reduce((s, o) => s + orderRevenue(o), 0),
    };
  });

  // ── Weekly cycle-time chart ────────────────────────────────────────────

  const weeksBack = Number(period) <= 30 ? 4 : 12;
  const weekStart = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weeksBack - 1);
  const weekDates = eachWeekOfInterval(
    { start: weekStart, end: endOfWeek(new Date(), { weekStartsOn: 1 }) },
    { weekStartsOn: 1 }
  );
  const weeklyData = weekDates.map((wStart) => {
    const wEnd   = endOfWeek(wStart, { weekStartsOn: 1 });
    const wOrds  = filtered.filter((o) => {
      const d = getCompletedAt(o);
      return d >= wStart && d <= wEnd;
    });
    const avgHours = wOrds.length
      ? wOrds.reduce((s, o) => s + getCycleMinutes(o), 0) / wOrds.length / 60
      : 0;
    return {
      week:          format(wStart, 'MMM d'),
      avgCycleHours: parseFloat(avgHours.toFixed(1)),
      orders:        wOrds.length,
    };
  });

  // ── Recent completed orders ────────────────────────────────────────────

  const recentCompleted = [...filtered]
    .sort((a, b) => getCompletedAt(b).getTime() - getCompletedAt(a).getTime())
    .slice(0, 10);

  // ── Loading skeleton ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────

  const EmptyChart = ({ height = 240 }: { height?: number }) => (
    <div
      className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
      style={{ height }}
    >
      <Package className="h-8 w-8 opacity-30" />
      <span>No completed orders in this period</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Performance</h1>
          <p className="text-muted-foreground">
            Track your order completions and efficiency
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">In the last {period} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCycleTime(avgCycleMinutes)}</div>
            <p className="text-xs text-muted-foreground">Creation → completed</p>
          </CardContent>
        </Card>

        {/* Revenue Processed card hidden
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Processed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total value of completed orders</p>
          </CardContent>
        </Card>
        */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fastest Completion</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCycleTime(fastestMinutes)}</div>
            <p className="text-xs text-muted-foreground">Best order turnaround</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Daily Line Chart ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Orders Completed Per Day
          </CardTitle>
          <CardDescription>
            Number of orders (left) and revenue (right) per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalCompleted === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={dailyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  interval={Number(period) <= 7 ? 0 : Number(period) <= 30 ? 3 : 7}
                />
                <YAxis
                  yAxisId="left"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`
                  }
                  width={52}
                />
                <Tooltip content={<DailyTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) =>
                    value === 'orders' ? 'Orders completed' : 'Revenue (₦)'
                  }
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke={COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: COLORS.primary, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: COLORS.primary }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: COLORS.secondary }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Weekly Cycle Time Bar Chart ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Avg Completion Time Per Week
          </CardTitle>
          <CardDescription>
            Average hours to complete an order (left) vs orders count (right) per week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalCompleted === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={weeklyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}h`}
                  width={36}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: COLORS.axis }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip content={<CycleTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) =>
                    value === 'avgCycleHours' ? 'Avg time (hours)' : 'Orders'
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="avgCycleHours"
                  fill={COLORS.bar1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  yAxisId="right"
                  dataKey="orders"
                  fill={COLORS.bar2}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Completed Orders Table ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Recent Completed Orders
          </CardTitle>
          <CardDescription>
            Your last 10 completed orders with cycle times
            {orders.length > 0 && ` · ${orders.length} total all-time`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentCompleted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed orders in the last {period} days
            </p>
          ) : (
            <div className="space-y-0">
              {recentCompleted.map((order, i) => {
                const cycleMin = getCycleMinutes(order);
                const revenue  = orderRevenue(order);
                const doneAt   = getCompletedAt(order);

                // Speed rating: < 2h = Fast, < 8h = Normal, >= 8h = Slow
                const speedVariant =
                  cycleMin < 120  ? 'default'
                  : cycleMin < 480 ? 'secondary'
                  : 'destructive';
                const speedLabel =
                  cycleMin < 120 ? 'Fast' : cycleMin < 480 ? 'Normal' : 'Slow';

                return (
                  <div key={order._id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
                      {/* Left */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">
                            {order.orderNumber}
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {serviceLabel(order)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {customerName(order)}
                          {' · '}
                          Completed {format(doneAt, 'MMM dd, yyyy · hh:mm a')}
                        </p>
                      </div>

                      {/* Right: metrics */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Cycle Time</p>
                          <p className="text-sm font-semibold">{formatCycleTime(cycleMin)}</p>
                        </div>
                        {revenue > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-semibold">
                              ₦{revenue.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <Badge variant={speedVariant} className="text-xs">
                          {speedLabel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
