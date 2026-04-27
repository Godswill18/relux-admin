// ============================================================================
// ADMIN DASHBOARD - Overview with Analytics Charts
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/api/client';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Eye,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useOrderStore } from '@/stores/useOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useServiceStore } from '@/stores/useServiceStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { ORDER_STATUS_CONFIG, getOrderStatusConfig } from '@/lib/statusConfig';
import {
  useFetchAnnouncements,
  AnnouncementBanners,
  AnnouncementPopups,
} from '@/components/shared/AnnouncementSystem';

// ============================================================================
// CONSTANTS — derived from shared status config
// ============================================================================

const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_CONFIG).map(([k, v]) => [k, v.hex])
);

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];


// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
}

function MetricCard({ title, value, description, icon, trend, accentColor }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accentColor ? `${accentColor}20` : 'hsl(var(--muted))' }}
        >
          <div className="h-4 w-4" style={{ color: accentColor || 'hsl(var(--muted-foreground))' }}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend.value >= 0 ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {trend.value >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'revenue'
            ? `Revenue: ₦${p.value.toLocaleString()}`
            : `Orders: ${p.value}`}
        </p>
      ))}
    </div>
  );
}

function OrdersTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">Count: {payload[0].value}</p>
    </div>
  );
}

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const { banners, popups } = useFetchAnnouncements();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrderStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { fetchServices } = useServiceStore();

  interface DashStats {
    totalRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    activeOrders: number;
    pendingPayments: number;
    todayOrders: number;
  }
  const [dashStats, setDashStats] = useState<DashStats | null>(null);
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders().catch(console.error);
    fetchCustomers().catch(console.error);
    fetchServices().catch(console.error);
    apiClient.get('/orders/dashboard-stats')
      .then((res) => setDashStats(res.data?.data ?? null))
      .catch(() => {});
    apiClient.get('/users/customer-stats')
      .then((res) => setTotalCustomers(res.data?.data?.active ?? null))
      .catch(() => {});
  }, [fetchOrders, fetchCustomers, fetchServices]);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  // ---- Metric computations — use server aggregates when available ----

  const totalRevenue    = dashStats?.totalRevenue    ?? 0;
  const activeOrders    = dashStats?.activeOrders    ?? safeOrders.filter((o: any) => !['completed','cancelled','delivered'].includes(o.status)).length;
  const pendingPayments = dashStats?.pendingPayments ?? 0;
  const activeCustomers = totalCustomers             ?? safeCustomers.filter((c: any) => c.isActive !== false).length;

  // ---- Recent orders: 5 most recent ----

  const recentOrders = useMemo(
    () =>
      [...safeOrders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [safeOrders]
  );

  // ---- Chart: Revenue + Order volume over last 7 days ----

  const last7DaysData = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const dayOrders = safeOrders.filter((o: any) =>
        isSameDay(new Date(o.createdAt), day)
      );
      const revenue = dayOrders
        .filter((o: any) => o.payment?.status === 'paid' || o.paymentStatus === 'paid')
        .reduce((sum: number, o: any) => sum + (o.pricing?.total || o.total || 0), 0);

      return {
        date: format(day, 'MMM d'),
        revenue,
        orders: dayOrders.length,
      };
    });
  }, [safeOrders]);

  // ---- Chart: Orders by status ----

  const ordersByStatus = useMemo(() => {
    const groups: Record<string, number> = {};
    safeOrders.forEach((o: any) => {
      const s = o.status || 'pending';
      groups[s] = (groups[s] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({
        name: getOrderStatusConfig(name).label,
        value,
        color: STATUS_COLORS[name] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [safeOrders]);

  // ---- Chart: Orders by service type ----

  const ordersByService = useMemo(() => {
    const groups: Record<string, number> = {};
    safeOrders.forEach((o: any) => {
      const s =
        o.serviceType?.replace(/-/g, ' ') ||
        o.orderType?.replace(/-/g, ' ') ||
        'General';
      const key = s.charAt(0).toUpperCase() + s.slice(1);
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, count], idx) => ({ name, count, fill: CHART_COLORS[idx % CHART_COLORS.length] }))
      .sort((a, b) => b.count - a.count);
  }, [safeOrders]);

  // ---- Chart: Payment method distribution ----

  const paymentMethods = useMemo(() => {
    const groups: Record<string, number> = {};
    safeOrders.forEach((o: any) => {
      const m = o.payment?.method || o.paymentMethod || 'cash';
      const key = m.charAt(0).toUpperCase() + m.slice(1);
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([name, value], idx) => ({ name, value, color: CHART_COLORS[idx % CHART_COLORS.length] }))
      .sort((a, b) => b.value - a.value);
  }, [safeOrders]);

  // ---- Today's stats — from server aggregates ----
  const todayOrdersCount = dashStats?.todayOrders ?? safeOrders.filter((o: any) => isSameDay(new Date(o.createdAt), new Date())).length;
  const todayRevenue     = dashStats?.todayRevenue ?? 0;
  const totalOrdersCount = dashStats?.totalOrders  ?? safeOrders.length;

  // Loading skeleton
  if (ordersLoading && safeOrders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}</h1>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Announcements ──────────────────────────────────────────────────── */}
      <AnnouncementBanners items={banners} />
      <AnnouncementPopups  items={popups} />

      {/* ------------------------------------------------------------------ */}
      {/* Page Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}</h1>
          <p className="text-muted-foreground">
            Welcome back — here's what's happening today
          </p>
        </div>
        <Button onClick={() => navigate('/admin/orders')}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric Cards */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : ''}`}>
        {isAdmin && (
          <MetricCard
            title="Total Revenue"
            value={`₦${totalRevenue.toLocaleString()}`}
            description="All paid orders"
            icon={<DollarSign />}
            accentColor="#10b981"
          />
        )}
        <MetricCard
          title="Active Orders"
          value={activeOrders}
          description="Currently in progress"
          icon={<ShoppingCart />}
          accentColor="#6366f1"
        />
        <MetricCard
          title="Total Customers"
          value={activeCustomers}
          description="Active accounts"
          icon={<Users />}
          accentColor="#3b82f6"
        />
        {isAdmin && (
          <MetricCard
            title="Pending Payments"
            value={pendingPayments}
            description="Awaiting payment"
            icon={<CreditCard />}
            accentColor="#f59e0b"
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Today at a Glance */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid gap-4 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Orders</p>
            <p className="text-3xl font-bold mt-1">{todayOrdersCount}</p>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Revenue</p>
              <p className="text-3xl font-bold mt-1">₦{todayRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Orders (All Time)</p>
            <p className="text-3xl font-bold mt-1">{totalOrdersCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts Row 1: Revenue Trend + Orders by Status */}
      {/* ------------------------------------------------------------------ */}
      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-3' : ''}`}>
        {/* Revenue Area Chart — admin only */}
        {isAdmin && <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenue & Orders — Last 7 Days
            </CardTitle>
            <CardDescription>Daily revenue from paid orders and total order count</CardDescription>
          </CardHeader>
          <CardContent>
            {safeOrders.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={last7DaysData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="left"
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend
                    formatter={(v) => (
                      <span className="text-xs capitalize text-muted-foreground">{v}</span>
                    )}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    dot={{ fill: '#6366f1', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    name="orders"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorOrders)"
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>}

        {/* Orders by Status Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution across all statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {ordersByStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<OrdersTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="space-y-1.5">
                  {ordersByStatus.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-medium">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts Row 2: Service Types + Payment Methods */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders by Service Type — Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Service Type</CardTitle>
            <CardDescription>Volume breakdown across service categories</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByService.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={ordersByService}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barSize={28}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => [v, 'Orders']}
                    contentStyle={{
                      fontSize: 12,
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {ordersByService.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>How customers are paying for orders</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={180}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      strokeWidth={2}
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<OrdersTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {paymentMethods.map((m) => {
                    const pct =
                      safeOrders.length > 0
                        ? Math.round((m.value / safeOrders.length) * 100)
                        : 0;
                    return (
                      <div key={m.name} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: m.color }}
                            />
                            <span className="text-muted-foreground">{m.name}</span>
                          </div>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Orders — 5 most recent */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>5 most recent orders across all statuses</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/orders')}>
              <Eye className="mr-2 h-4 w-4" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/admin/orders')}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Create First Order
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order: any) => {
                const status = order.status || 'pending';
                const statusColor = STATUS_COLORS[status] || '#94a3b8';
                const total = order.pricing?.total || order.total || 0;
                const payStatus = order.payment?.status || order.paymentStatus || 'unpaid';

                return (
                  <div
                    key={order._id}
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-accent/50 px-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/admin/orders/${order._id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${statusColor}18` }}
                      >
                        <Package className="h-4 w-4" style={{ color: statusColor }} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {order.code || order.orderNumber || `#${order._id?.substring(0, 8)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.customer?.name || 'Unknown Customer'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className="text-xs capitalize"
                        style={{ borderColor: `${statusColor}50`, color: statusColor }}
                      >
                        {getOrderStatusConfig(status).label}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          ₦{total.toLocaleString()}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: payStatus === 'paid' ? '#16a34a' : '#f59e0b' }}
                        >
                          {payStatus}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground hidden sm:block min-w-[72px] text-right">
                        {format(new Date(order.createdAt || new Date()), 'MMM d, yyyy')}
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

// ============================================================================
// EMPTY CHART PLACEHOLDER
// ============================================================================

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground">
      <div className="text-center">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-20" />
        <p className="text-xs">No data yet</p>
      </div>
    </div>
  );
}
