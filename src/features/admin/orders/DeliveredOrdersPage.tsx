// ============================================================================
// DELIVERED ORDERS PAGE
// Tracking page for all delivered orders with filtering and search
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, CheckCircle2, Package, User, Clock,
  CalendarDays, Filter, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { format, isToday, isYesterday, startOfWeek, isWithinInterval, parseISO } from 'date-fns';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function getDeliveredBy(order: any): string {
  const history: any[] = order.statusHistory ?? [];
  const entry = [...history].reverse().find((h) => h.status === 'delivered');
  return entry?.updatedBy?.name ?? '—';
}

function getCustomerName(order: any): string {
  if (order.orderSource === 'offline') return order.walkInCustomer?.name ?? 'Walk-in';
  return order.customer?.name ?? '—';
}

function formatDeliveredAt(order: any): string {
  const ts = order.actualDeliveryDate ?? order.updatedAt;
  if (!ts) return '—';
  return format(new Date(ts), 'MMM dd, yyyy · h:mm a');
}

// ============================================================================
// DATE RANGE FILTER OPTIONS
// ============================================================================

type DateFilter = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month';

function matchesDateFilter(order: any, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const ts = order.actualDeliveryDate ?? order.updatedAt;
  if (!ts) return false;
  const date = new Date(ts);
  const now = new Date();
  if (filter === 'today') return isToday(date);
  if (filter === 'yesterday') return isYesterday(date);
  if (filter === 'this_week') {
    return isWithinInterval(date, { start: startOfWeek(now, { weekStartsOn: 1 }), end: now });
  }
  if (filter === 'this_month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function DeliveredOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    const fetchDelivered = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/orders', {
          params: { status: 'delivered', limit: 200 },
        });
        const raw = res.data?.data?.orders ?? res.data?.data ?? [];
        setOrders(Array.isArray(raw) ? raw : []);
      } catch (err: any) {
        toast.error('Failed to load delivered orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDelivered();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((order) => {
      if (!matchesDateFilter(order, dateFilter)) return false;
      if (!q) return true;
      const customerName = getCustomerName(order).toLowerCase();
      const orderNum = (order.orderNumber ?? '').toLowerCase();
      const staffName = getDeliveredBy(order).toLowerCase();
      return customerName.includes(q) || orderNum.includes(q) || staffName.includes(q);
    });
  }, [orders, search, dateFilter]);

  // Stats
  const todayCount = orders.filter((o) => matchesDateFilter(o, 'today')).length;
  const weekCount = orders.filter((o) => matchesDateFilter(o, 'this_week')).length;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.pricing?.total ?? o.total ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Delivered Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            All orders confirmed as delivered
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weekCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, customer, or staff…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="this_month">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Log</CardTitle>
          <CardDescription>
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Package className="h-12 w-12 opacity-30" />
              <p className="text-sm">No delivered orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <DeliveredOrderRow
                  key={order._id}
                  order={order}
                  onView={() => navigate(`/admin/orders/${order._id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ROW COMPONENT
// ============================================================================

function DeliveredOrderRow({ order, onView }: { order: any; onView: () => void }) {
  const customerName = getCustomerName(order);
  const deliveredBy = getDeliveredBy(order);
  const deliveredAt = formatDeliveredAt(order);
  const isWalkIn = order.orderSource === 'offline';
  const items: any[] = order.items ?? [];
  const total = order.pricing?.total ?? order.total ?? 0;

  return (
    <div className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2 min-w-0">
          {/* Order number + badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{order.orderNumber ?? '—'}</span>
            {isWalkIn && (
              <Badge variant="outline" className="text-xs">Walk-in</Badge>
            )}
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">
              Delivered
            </Badge>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customerName}</span>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {items[0].itemType ?? '—'}
                {items.length > 1 && ` +${items.length - 1} more`}
              </span>
            </div>
          )}

          <Separator className="my-1" />

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {/* Delivered at */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{deliveredAt}</span>
            </div>
            {/* Delivered by */}
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
              <span>By <strong>{deliveredBy}</strong></span>
            </div>
          </div>
        </div>

        {/* Right: total + view */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="font-semibold text-sm">₦{total.toLocaleString()}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onView}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
