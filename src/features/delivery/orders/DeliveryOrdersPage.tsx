// ============================================================================
// DELIVERY ORDERS PAGE - Three-tab view for delivery role
// Tab 1: Pickup & Delivery — orders requiring physical pickup first
// Tab 2: Delivery Only    — already processed, just need delivery
// Tab 3: Delivered        — completed deliveries with amounts
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Truck, PackageCheck, Navigation, CheckCircle2, Clock, Search,
  RefreshCw, Eye, MapPin, Phone, User, Package, ScanLine,
  TrendingUp, CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BarcodeScannerModal } from '@/features/admin/orders/BarcodeScannerModal';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
import { format, isToday, isYesterday, startOfWeek, isWithinInterval, startOfMonth } from 'date-fns';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';

// ============================================================================
// HELPERS
// ============================================================================

function customerName(order: any): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}
function customerPhone(order: any): string {
  return order.walkInCustomer?.phone || order.customer?.phone || '—';
}
function orderTotal(order: any): number {
  return order.pricing?.total ?? order.totalAmount ?? order.total ?? 0;
}
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  // Object with street/city/state
  return [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
}

// ============================================================================
// ORDER CARD (active orders)
// ============================================================================

interface OrderCardProps {
  order: any;
  onAction: (order: any, status: string) => void;
  onView: (order: any) => void;
  isUpdating: boolean;
}

function OrderCard({ order, onAction, onView, isUpdating }: OrderCardProps) {
  const status: string = order.status;

  const actions: { label: string; status: string }[] = [];
  if (['pending', 'confirmed', 'pending-pickup'].includes(status)) {
    actions.push({ label: 'Mark as Picked Up', status: 'picked-up' });
  }
  if (status === 'ready') {
    actions.push({ label: 'Start Delivery', status: 'out-for-delivery' });
  }
  if (status === 'out-for-delivery') {
    actions.push({ label: 'Mark as Delivered', status: 'delivered' });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{customerName(order)}</span>
          </div>
          {customerPhone(order) !== '—' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${customerPhone(order)}`} className="hover:underline">
                {customerPhone(order)}
              </a>
            </div>
          )}
          {formatAddress(order.deliveryAddress) && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{formatAddress(order.deliveryAddress)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span>{order.service || order.serviceType || '—'}</span>
            {order.addOns?.pickup && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">Pickup</Badge>
            )}
          </div>
          {orderTotal(order) > 0 && (
            <span className="font-medium text-foreground">
              ₦{orderTotal(order).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => onView(order)}>
            <Eye className="h-3.5 w-3.5 mr-1" />View
          </Button>
          {actions.map((a) => (
            <Button
              key={a.status}
              size="sm"
              className="h-8 px-3 text-xs flex-1"
              onClick={() => onAction(order, a.status)}
              disabled={isUpdating}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DELIVERED ORDER CARD
// ============================================================================

function DeliveredCard({ order, onView }: { order: any; onView: (o: any) => void }) {
  const deliveredAt = order.actualDeliveryDate ?? order.updatedAt;
  const total = orderTotal(order);
  const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {deliveredAt ? format(new Date(deliveredAt), 'MMM d, yyyy · h:mm a') : '—'}
            </p>
          </div>
          <PaymentStatusBadge status={payStatus} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{customerName(order)}</span>
          </div>
          {customerPhone(order) !== '—' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${customerPhone(order)}`} className="hover:underline">
                {customerPhone(order)}
              </a>
            </div>
          )}
          {formatAddress(order.deliveryAddress) && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{formatAddress(order.deliveryAddress)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {order.service || order.serviceType || '—'}
          </span>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                ₦{total.toLocaleString()}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onView(order)}>
              <Eye className="h-3.5 w-3.5 mr-1" />View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ORDER DETAIL MODAL
// ============================================================================

function OrderDetailModal({ order, open, onOpenChange }: {
  order: any; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  if (!order) return null;
  const total = orderTotal(order);
  const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';
  const items: any[] = order.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {order.orderNumber}</DialogTitle>
          <DialogDescription>Full order details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Status</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Payment</span>
            <PaymentStatusBadge status={payStatus} />
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-medium">{customerName(order)}</span>
          </div>
          {customerPhone(order) !== '—' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <a href={`tel:${customerPhone(order)}`} className="font-medium hover:underline">
                {customerPhone(order)}
              </a>
            </div>
          )}
          {formatAddress(order.deliveryAddress) && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Delivery Address</span>
              <span className="font-medium">{formatAddress(order.deliveryAddress)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium">{order.service || order.serviceType || '—'}</span>
          </div>
          {items.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs uppercase tracking-wider">Items</p>
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                  <span>{item.itemType ?? '—'} × {item.quantity ?? 1}</span>
                  {item.unitPrice != null && (
                    <span className="font-medium">₦{((item.unitPrice ?? 0) * (item.quantity ?? 1)).toLocaleString()}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <Separator />
          {total > 0 && (
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span className="text-emerald-600 dark:text-emerald-400">₦{total.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Created</span>
            <span>{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</span>
          </div>
          {order.actualDeliveryDate && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Delivered</span>
              <span>{format(new Date(order.actualDeliveryDate), 'MMM d, yyyy h:mm a')}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" /> {label}
    </p>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DeliveryOrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'delivery-only'
    ? 'delivery-only'
    : searchParams.get('tab') === 'delivered'
    ? 'delivered'
    : 'pickup-delivery';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Delivered tab date filter
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'>('all');

  // ── Load orders ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/orders', { params: { limit: 300 } });
      const raw = res.data.data;
      const list: any[] = Array.isArray(raw) ? raw : raw?.orders ?? [];
      setOrders(list);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Status update ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (order: any, newStatus: string) => {
    const id = order._id || order.id;
    setUpdatingId(id);
    try {
      await apiClient.patch(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Order ${order.orderNumber} updated to ${newStatus.replace(/-/g, ' ')}`);
      setOrders((prev) =>
        prev.map((o) => (o._id === id || o.id === id) ? { ...o, status: newStatus } : o)
      );
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  // ── Derived lists ────────────────────────────────────────────────────────
  const pickupDeliveryOrders = useMemo(() =>
    orders.filter((o) =>
      o.addOns?.pickup && !['delivered', 'completed', 'cancelled'].includes(o.status)
    ), [orders]);

  const deliveryOnlyOrders = useMemo(() =>
    orders.filter((o) =>
      ['ready', 'out-for-delivery'].includes(o.status) && !o.addOns?.pickup
    ), [orders]);

  const deliveredOrders = useMemo(() =>
    orders.filter((o) => ['delivered', 'completed'].includes(o.status)), [orders]);

  // Date filter for delivered tab
  const filteredDelivered = useMemo(() => {
    let list = deliveredOrders;
    if (dateFilter !== 'all') {
      const now = new Date();
      list = list.filter((o) => {
        const ts = o.actualDeliveryDate ?? o.updatedAt;
        if (!ts) return false;
        const d = new Date(ts);
        if (dateFilter === 'today') return isToday(d);
        if (dateFilter === 'yesterday') return isYesterday(d);
        if (dateFilter === 'this_week') return isWithinInterval(d, { start: startOfWeek(now), end: now });
        if (dateFilter === 'this_month') return isWithinInterval(d, { start: startOfMonth(now), end: now });
        return true;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((o) =>
        (o.orderNumber ?? '').toLowerCase().includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        formatAddress(o.deliveryAddress).toLowerCase().includes(q)
      );
    }
    return list;
  }, [deliveredOrders, dateFilter, search]);

  // Summary stats for delivered tab
  const deliveredStats = useMemo(() => ({
    count: filteredDelivered.length,
    total: filteredDelivered.reduce((sum, o) => sum + orderTotal(o), 0),
    paid: filteredDelivered.filter((o) => (o.paymentStatus || o.payment?.status) === 'paid').length,
  }), [filteredDelivered]);

  // Search filter for active tabs
  const filterBySearch = useCallback((list: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) =>
      (o.orderNumber ?? '').toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q) ||
      formatAddress(o.deliveryAddress).toLowerCase().includes(q)
    );
  }, [search]);

  const filteredPickup = useMemo(() => filterBySearch(pickupDeliveryOrders), [filterBySearch, pickupDeliveryOrders]);
  const filteredDeliveryOnly = useMemo(() => filterBySearch(deliveryOnlyOrders), [filterBySearch, deliveryOnlyOrders]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm">Manage pickups and deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order #, customer, or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pickup-delivery" className="gap-1.5 text-xs sm:text-sm">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pickup & </span>Delivery
            {pickupDeliveryOrders.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">
                {pickupDeliveryOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivery-only" className="gap-1.5 text-xs sm:text-sm">
            <PackageCheck className="h-3.5 w-3.5" />
            <span>Delivery</span>
            {deliveryOnlyOrders.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">
                {deliveryOnlyOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-1.5 text-xs sm:text-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Delivered
            {deliveredOrders.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">
                {deliveredOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Pickup & Delivery ──────────────────────────────────────── */}
        <TabsContent value="pickup-delivery" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
            </div>
          ) : filteredPickup.length === 0 ? (
            <EmptyState icon={Truck} message={search ? 'No orders match your search' : 'No pickup & delivery orders'} />
          ) : (
            <div className="space-y-4">
              {filteredPickup.filter((o) => ['out-for-delivery', 'picked-up'].includes(o.status)).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Navigation} label="In Transit" />
                  {filteredPickup
                    .filter((o) => ['out-for-delivery', 'picked-up'].includes(o.status))
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onAction={handleAction} onView={setViewOrder} isUpdating={updatingId === (o._id || o.id)} />
                    ))}
                </div>
              )}
              {filteredPickup.filter((o) => ['pending', 'confirmed', 'pending-pickup'].includes(o.status)).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Clock} label="Awaiting Pickup" />
                  {filteredPickup
                    .filter((o) => ['pending', 'confirmed', 'pending-pickup'].includes(o.status))
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onAction={handleAction} onView={setViewOrder} isUpdating={updatingId === (o._id || o.id)} />
                    ))}
                </div>
              )}
              {filteredPickup.filter((o) => ['in_progress', 'washing', 'ironing', 'ready'].includes(o.status)).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={PackageCheck} label="At Laundry" />
                  {filteredPickup
                    .filter((o) => ['in_progress', 'washing', 'ironing', 'ready'].includes(o.status))
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onAction={handleAction} onView={setViewOrder} isUpdating={updatingId === (o._id || o.id)} />
                    ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Delivery Only ──────────────────────────────────────────── */}
        <TabsContent value="delivery-only" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
            </div>
          ) : filteredDeliveryOnly.length === 0 ? (
            <EmptyState icon={PackageCheck} message={search ? 'No orders match your search' : 'No delivery-only orders'} />
          ) : (
            <div className="space-y-4">
              {filteredDeliveryOnly.filter((o) => o.status === 'out-for-delivery').length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Navigation} label="Out for Delivery" />
                  {filteredDeliveryOnly
                    .filter((o) => o.status === 'out-for-delivery')
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onAction={handleAction} onView={setViewOrder} isUpdating={updatingId === (o._id || o.id)} />
                    ))}
                </div>
              )}
              {filteredDeliveryOnly.filter((o) => o.status === 'ready').length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={PackageCheck} label="Ready for Delivery" />
                  {filteredDeliveryOnly
                    .filter((o) => o.status === 'ready')
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onAction={handleAction} onView={setViewOrder} isUpdating={updatingId === (o._id || o.id)} />
                    ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Delivered ─────────────────────────────────────────────── */}
        <TabsContent value="delivered" className="mt-4 space-y-4">
          {/* Date filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'today', 'yesterday', 'this_week', 'this_month'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  dateFilter === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'this_week' ? 'This Week' : f === 'this_month' ? 'This Month' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Summary stats */}
          {!loading && filteredDelivered.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{deliveredStats.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Delivered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{deliveredStats.paid}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Paid</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                    ₦{deliveredStats.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total Value</p>
                </CardContent>
              </Card>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
            </div>
          ) : filteredDelivered.length === 0 ? (
            <EmptyState icon={CheckCircle2} message={search ? 'No delivered orders match your search' : 'No delivered orders yet'} />
          ) : (
            <div className="space-y-2">
              {filteredDelivered
                .sort((a, b) => {
                  const ta = new Date(a.actualDeliveryDate ?? a.updatedAt).getTime();
                  const tb = new Date(b.actualDeliveryDate ?? b.updatedAt).getTime();
                  return tb - ta;
                })
                .map((o) => (
                  <DeliveredCard key={o._id || o.id} order={o} onView={setViewOrder} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Barcode scanner */}
      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        confirmPath="/delivery/orders/delivery-confirm"
      />

      {/* Order detail modal */}
      <OrderDetailModal
        order={viewOrder}
        open={!!viewOrder}
        onOpenChange={(open) => !open && setViewOrder(null)}
      />
    </div>
  );
}
