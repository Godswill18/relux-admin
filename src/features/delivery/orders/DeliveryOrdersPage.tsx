// ============================================================================
// DELIVERY ORDERS PAGE — Controlled workflow with real-time locking
//
// Sections:
//   Available Pickups   — confirmed, no pickupStaffId
//   My Pickups          — pickupStaffId = me, not yet picked-up
//   Available Deliveries— ready, no deliveredBy
//   My Deliveries       — deliveredBy = me, out-for-delivery
//   Delivered           — delivered/completed by me
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, PackageCheck, Navigation, CheckCircle2, Clock, Search,
  RefreshCw, Eye, MapPin, Phone, User, Package, ScanLine,
  Lock, Unlock, AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BarcodeScannerModal } from '@/features/admin/orders/BarcodeScannerModal';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
import { useAuthStore } from '@/stores/useAuthStore';
import { format, isToday, isYesterday, startOfWeek, startOfMonth, isWithinInterval } from 'date-fns';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';
import { toast } from 'sonner';

// ============================================================================
// HELPERS
// ============================================================================

function customerName(o: any): string {
  return o.walkInCustomer?.name || o.customer?.name || '—';
}
function customerPhone(o: any): string {
  return o.walkInCustomer?.phone || o.customer?.phone || '—';
}
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  return [addr.street, addr.city, addr.state].filter(Boolean).join(', ');
}
function deliveryFee(o: any): number {
  return o.pricing?.deliveryFee ?? o.deliveryFee ?? 0;
}
function orderTotal(o: any): number {
  return o.pricing?.total ?? o.totalAmount ?? o.total ?? 0;
}

// ============================================================================
// ORDER CARD
// ============================================================================

type CardAction = {
  label: string;
  icon?: React.ElementType;
  variant?: 'default' | 'outline' | 'destructive';
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

function OrderCard({
  order, actions = [], onView, highlight,
}: {
  order: any;
  actions?: CardAction[];
  onView: (o: any) => void;
  highlight?: 'green' | 'blue';
}) {
  const addr = formatAddress(order.deliveryAddress);
  const borderClass = highlight === 'green'
    ? 'border-emerald-300 dark:border-emerald-700'
    : highlight === 'blue'
    ? 'border-blue-300 dark:border-blue-700'
    : '';

  return (
    <Card className={borderClass}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Customer */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{customerName(order)}</span>
          </div>
          {customerPhone(order) !== '—' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${customerPhone(order)}`} className="hover:underline">{customerPhone(order)}</a>
            </div>
          )}
          {addr && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{addr}</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            <span>{order.service || order.serviceType || '—'}</span>
            {order.orderType === 'pickup-delivery' && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">Pickup+Delivery</Badge>
            )}
          </div>
          {deliveryFee(order) > 0 && (
            <span className="font-medium text-foreground">
              Delivery: ₦{deliveryFee(order).toLocaleString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => onView(order)}>
            <Eye className="h-3.5 w-3.5 mr-1" />View
          </Button>
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <Button
                key={i}
                size="sm"
                variant={a.variant ?? 'default'}
                className="h-8 px-3 text-xs flex-1 min-w-[100px]"
                onClick={a.onClick}
                disabled={a.disabled || a.loading}
              >
                {a.loading
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                  : Icon ? <Icon className="h-3.5 w-3.5 mr-1" /> : null
                }
                {a.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DELIVERED CARD
// ============================================================================

function DeliveredCard({ order, onView }: { order: any; onView: (o: any) => void }) {
  const deliveredAt = order.actualDeliveryDate ?? order.updatedAt;
  const fee = deliveryFee(order);
  const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';
  const addr = formatAddress(order.deliveryAddress);

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
              <a href={`tel:${customerPhone(order)}`} className="hover:underline">{customerPhone(order)}</a>
            </div>
          )}
          {addr && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{addr}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{order.service || order.serviceType || '—'}</span>
          <div className="flex items-center gap-2">
            {fee > 0 && (
              <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                ₦{fee.toLocaleString()}
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
// SECTION LABEL
// ============================================================================

function SectionLabel({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />{label}
      </p>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="h-4 min-w-[18px] text-[10px] px-1">{count}</Badge>
      )}
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
      <Icon className="h-9 w-9 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// ORDER DETAIL MODAL
// ============================================================================

function OrderDetailModal({ order, open, onOpenChange }: {
  order: any; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  if (!order) return null;
  const fee = deliveryFee(order);
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
              <a href={`tel:${customerPhone(order)}`} className="font-medium hover:underline">{customerPhone(order)}</a>
            </div>
          )}
          {formatAddress(order.deliveryAddress) && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Delivery Address</span>
              <span className="font-medium">{formatAddress(order.deliveryAddress)}</span>
            </div>
          )}
          <Separator />
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
          {fee > 0 && (
            <div className="flex justify-between font-semibold">
              <span>Delivery Fee</span>
              <span className="text-emerald-600 dark:text-emerald-400">₦{fee.toLocaleString()}</span>
            </div>
          )}
          {total > 0 && (
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Order Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          )}
          {order.pickupStaffId && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pickup Staff</span>
              <span className="font-medium">{order.pickupStaffId?.name ?? '—'}</span>
            </div>
          )}
          {order.deliveredBy && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Staff</span>
              <span className="font-medium">{order.deliveredBy?.name ?? '—'}</span>
            </div>
          )}
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
// SCAN MODAL — pickup or delivery mode
// ============================================================================

function ScanModal({ open, onOpenChange, mode }: {
  open: boolean; onOpenChange: (v: boolean) => void; mode: 'pickup' | 'delivery';
}) {
  const confirmPath = mode === 'pickup'
    ? '/delivery/orders/scan-pickup'
    : '/delivery/orders/delivery-confirm';
  return (
    <BarcodeScannerModal
      open={open}
      onOpenChange={onOpenChange}
      confirmPath={confirmPath}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DeliveryOrdersPage() {
  const { user } = useAuthStore();
  const userId = (user as any)?._id || user?.id;

  const [searchParams] = useSearchParams();
  const defaultTab = (['pickup', 'picked-up', 'delivery', 'delivered'].includes(searchParams.get('tab') ?? ''))
    ? searchParams.get('tab')!
    : 'pickup';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [scanMode, setScanMode] = useState<'pickup' | 'delivery' | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month'>('all');

  // Derive myId early so it can be used in effects and callbacks below
  const myId = String(userId ?? '');

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, doneRes] = await Promise.all([
        apiClient.get('/orders', { params: { limit: 200 } }),
        apiClient.get('/orders', { params: { limit: 300, doneOnly: 'true', deliveredBy: 'me' } }),
      ]);
      const toList = (r: any) => {
        const raw = r.data.data;
        return Array.isArray(raw) ? raw : raw?.orders ?? [];
      };
      const active = toList(activeRes).filter((o: any) => !['delivered', 'completed', 'cancelled'].includes(o.status));
      const done = toList(doneRes);
      setOrders([...active, ...done]);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Real-time socket updates ──────────────────────────────────────────────
  // Retry attaching listeners every 500 ms until the socket is ready,
  // then keep them alive. Also poll every 30 s as a fallback.
  useEffect(() => {
    const onPickupClaimed = ({ orderId, pickupStaffId }: any) => {
      setOrders((prev) => prev.map((o) =>
        (o._id === orderId || o.id === orderId)
          ? { ...o, pickupStaffId: { _id: pickupStaffId } }
          : o
      ));
    };
    const onDeliveryClaimed = ({ orderId, deliveredBy }: any) => {
      setOrders((prev) => prev.map((o) =>
        (o._id === orderId || o.id === orderId)
          ? { ...o, deliveredBy: { _id: deliveredBy }, status: 'out-for-delivery' }
          : o
      ));
    };
    const onStatusUpdated = ({ orderId, status }: any) => {
      setOrders((prev) => {
        // If status moved to delivered/completed/cancelled and it's not our
        // delivered order, drop it from the active list entirely
        const shouldRemove = ['delivered', 'completed', 'cancelled'].includes(status);
        return prev
          .map((o) => (o._id === orderId || o.id === orderId) ? { ...o, status } : o)
          .filter((o) => {
            if ((o._id === orderId || o.id === orderId) && shouldRemove) {
              // Keep if it's in our delivered slice (deliveredBy = me)
              const did = o.deliveredBy?._id || o.deliveredBy;
              return did && String(did) === myId;
            }
            return true;
          });
      });
    };
    const onOrderCreated = () => loadOrders();

    let cleanup: (() => void) | null = null;

    // Keep trying until socket is available
    const attachRetry = setInterval(() => {
      const socket = socketClient.getSocket();
      if (!socket) return;

      clearInterval(attachRetry);

      socket.on('order:pickup-claimed',   onPickupClaimed);
      socket.on('order:delivery-claimed', onDeliveryClaimed);
      socket.on('order:status-updated',   onStatusUpdated);
      socket.on('order-status-updated',   onStatusUpdated);
      socket.on('order:created',          onOrderCreated);
      socket.on('order-created',          onOrderCreated);

      cleanup = () => {
        socket.off('order:pickup-claimed',   onPickupClaimed);
        socket.off('order:delivery-claimed', onDeliveryClaimed);
        socket.off('order:status-updated',   onStatusUpdated);
        socket.off('order-status-updated',   onStatusUpdated);
        socket.off('order:created',          onOrderCreated);
        socket.off('order-created',          onOrderCreated);
      };
    }, 500);

    // 30-second polling fallback for missed events
    const poll = setInterval(() => loadOrders(), 30_000);

    return () => {
      clearInterval(attachRetry);
      clearInterval(poll);
      cleanup?.();
    };
  }, [loadOrders, myId]);

  // ── Accept pickup (atomic) ────────────────────────────────────────────────
  const acceptPickup = useCallback(async (order: any) => {
    const id = order._id || order.id;
    setActionLoading((p) => ({ ...p, [`pickup-${id}`]: true }));
    try {
      const res = await apiClient.patch(`/orders/${id}/accept-pickup`);
      const updated = res.data.data.order;
      setOrders((prev) => prev.map((o) => (o._id === id || o.id === id) ? { ...o, ...updated } : o));
      toast.success(`Pickup claimed for ${order.orderNumber}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to claim pickup';
      toast.error(msg);
      // Refresh to get latest state if conflict
      if (err.response?.status === 409) loadOrders();
    } finally {
      setActionLoading((p) => ({ ...p, [`pickup-${id}`]: false }));
    }
  }, [loadOrders]);

  // ── Accept delivery (atomic) ──────────────────────────────────────────────
  const acceptDelivery = useCallback(async (order: any) => {
    const id = order._id || order.id;
    setActionLoading((p) => ({ ...p, [`delivery-${id}`]: true }));
    try {
      const res = await apiClient.patch(`/orders/${id}/accept-delivery`);
      const updated = res.data.data.order;
      setOrders((prev) => prev.map((o) => (o._id === id || o.id === id) ? { ...o, ...updated } : o));
      toast.success(`Delivery claimed for ${order.orderNumber}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to claim delivery';
      toast.error(msg);
      if (err.response?.status === 409) loadOrders();
    } finally {
      setActionLoading((p) => ({ ...p, [`delivery-${id}`]: false }));
    }
  }, [loadOrders]);

  // ── Derived slices ────────────────────────────────────────────────────────

  const isMyPickup = (o: any) => {
    const pid = o.pickupStaffId?._id || o.pickupStaffId;
    return pid && String(pid) === myId;
  };
  const isMyDelivery = (o: any) => {
    const did = o.deliveredBy?._id || o.deliveredBy;
    return did && String(did) === myId;
  };

  // Tab 1 — Pickup tab: available + mine
  const availablePickups = useMemo(() =>
    orders.filter((o) =>
      o.status === 'confirmed' &&
      o.orderType === 'pickup-delivery' &&
      !o.pickupStaffId
    ), [orders]);

  const myPickups = useMemo(() =>
    orders.filter((o) =>
      o.status === 'confirmed' &&
      o.orderType === 'pickup-delivery' &&
      isMyPickup(o)
    ), [orders, myId]);

  // Picked-up tab — orders I've physically collected, now at laundry
  const myPickedUp = useMemo(() =>
    orders.filter((o) =>
      ['picked-up', 'in_progress', 'washing', 'ironing', 'ready'].includes(o.status) &&
      isMyPickup(o)
    ), [orders, myId]);

  // Tab 2 — Delivery tab: available + mine
  const availableDeliveries = useMemo(() =>
    orders.filter((o) =>
      o.status === 'ready' && !o.deliveredBy
    ), [orders]);

  const myDeliveries = useMemo(() =>
    orders.filter((o) =>
      o.status === 'out-for-delivery' && isMyDelivery(o)
    ), [orders, myId]);

  // Tab 3 — Delivered
  const deliveredOrders = useMemo(() =>
    orders.filter((o) => ['delivered', 'completed'].includes(o.status)), [orders]);

  const filteredDelivered = useMemo(() => {
    let list = deliveredOrders;
    const now = new Date();
    if (dateFilter !== 'all') {
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
    return list.sort((a, b) =>
      new Date(b.actualDeliveryDate ?? b.updatedAt).getTime() -
      new Date(a.actualDeliveryDate ?? a.updatedAt).getTime()
    );
  }, [deliveredOrders, dateFilter, search]);

  const deliveredStats = useMemo(() => ({
    count: filteredDelivered.length,
    total: filteredDelivered.reduce((s, o) => s + deliveryFee(o), 0),
    paid: filteredDelivered.filter((o) => (o.paymentStatus || o.payment?.status) === 'paid').length,
  }), [filteredDelivered]);

  const applySearch = (list: any[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) =>
      (o.orderNumber ?? '').toLowerCase().includes(q) ||
      customerName(o).toLowerCase().includes(q) ||
      formatAddress(o.deliveryAddress).toLowerCase().includes(q)
    );
  };

  const pickupTabCount = availablePickups.length + myPickups.length;
  const deliveryTabCount = availableDeliveries.length + myDeliveries.length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground text-sm">Pickup & delivery workflow</p>
        </div>
        <div className="flex items-center gap-2">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="pickup" className="gap-1 text-xs">
            <Truck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pickups</span>
            <span className="sm:hidden">Pick</span>
            {pickupTabCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">{pickupTabCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="picked-up" className="gap-1 text-xs">
            <PackageCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Picked Up</span>
            <span className="sm:hidden">At Shop</span>
            {myPickedUp.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">{myPickedUp.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivery" className="gap-1 text-xs">
            <Navigation className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deliveries</span>
            <span className="sm:hidden">Deliver</span>
            {deliveryTabCount > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">{deliveryTabCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="delivered" className="gap-1 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delivered</span>
            <span className="sm:hidden">Done</span>
            {deliveredOrders.length > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] text-[10px] px-1">{deliveredOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1 — PICKUPS
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pickup" className="mt-4 space-y-5">
          {/* Scan button */}
          <Button className="w-full" variant="outline" onClick={() => setScanMode('pickup')}>
            <ScanLine className="h-4 w-4 mr-2" />Scan Barcode to Confirm Pickup
          </Button>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
          ) : (
            <>
              {/* My Pickups — orders I claimed, awaiting scan */}
              {applySearch(myPickups).filter((o) => o.status === 'confirmed').length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Lock} label="My Pickups — Awaiting Scan" count={myPickups.filter((o) => o.status === 'confirmed').length} />
                  {applySearch(myPickups)
                    .filter((o) => o.status === 'confirmed')
                    .map((o) => (
                      <OrderCard
                        key={o._id || o.id}
                        order={o}
                        onView={setViewOrder}
                        highlight="blue"
                        actions={[]}
                      />
                    ))}
                  <p className="text-xs text-center text-muted-foreground pb-1">
                    Scan the barcode above to confirm pickup
                  </p>
                </div>
              )}

              {/* Available Pickups */}
              {applySearch(availablePickups).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Unlock} label="Available Pickups" count={availablePickups.length} />
                  {applySearch(availablePickups).map((o) => (
                    <OrderCard
                      key={o._id || o.id}
                      order={o}
                      onView={setViewOrder}
                      actions={[{
                        label: 'Accept Pickup',
                        icon: Truck,
                        loading: actionLoading[`pickup-${o._id || o.id}`],
                        onClick: () => acceptPickup(o),
                      }]}
                    />
                  ))}
                </div>
              )}

              {applySearch(availablePickups).length === 0 && applySearch(myPickups).filter((o) => o.status === 'confirmed').length === 0 && (
                <EmptyState icon={Truck} message="No pickup orders available" />
              )}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2 — PICKED UP (at laundry)
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="picked-up" className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
          ) : applySearch(myPickedUp).length === 0 ? (
            <EmptyState icon={PackageCheck} message="No picked-up orders yet" />
          ) : (
            <div className="space-y-4">
              {/* Currently at laundry being processed */}
              {applySearch(myPickedUp).filter((o) => ['picked-up', 'in_progress', 'washing', 'ironing'].includes(o.status)).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel
                    icon={Clock}
                    label="At Laundry"
                    count={applySearch(myPickedUp).filter((o) => ['picked-up', 'in_progress', 'washing', 'ironing'].includes(o.status)).length}
                  />
                  {applySearch(myPickedUp)
                    .filter((o) => ['picked-up', 'in_progress', 'washing', 'ironing'].includes(o.status))
                    .map((o) => (
                      <OrderCard
                        key={o._id || o.id}
                        order={o}
                        onView={setViewOrder}
                        highlight="blue"
                        actions={[]}
                      />
                    ))}
                </div>
              )}

              {/* Ready — processed, waiting for delivery */}
              {applySearch(myPickedUp).filter((o) => o.status === 'ready').length > 0 && (
                <div className="space-y-2">
                  <SectionLabel
                    icon={PackageCheck}
                    label="Ready for Delivery"
                    count={applySearch(myPickedUp).filter((o) => o.status === 'ready').length}
                  />
                  {applySearch(myPickedUp)
                    .filter((o) => o.status === 'ready')
                    .map((o) => (
                      <OrderCard
                        key={o._id || o.id}
                        order={o}
                        onView={setViewOrder}
                        highlight="green"
                        actions={[{
                          label: 'Accept Delivery',
                          icon: Navigation,
                          loading: actionLoading[`delivery-${o._id || o.id}`],
                          onClick: () => acceptDelivery(o),
                          disabled: !!(o.deliveredBy),
                        }]}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3 — DELIVERIES
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="delivery" className="mt-4 space-y-5">
          {/* Scan button */}
          <Button className="w-full" variant="outline" onClick={() => setScanMode('delivery')}>
            <ScanLine className="h-4 w-4 mr-2" />Scan Barcode to Confirm Delivery
          </Button>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}</div>
          ) : (
            <>
              {/* Out for delivery */}
              {applySearch(myDeliveries).filter((o) => o.status === 'out-for-delivery').length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={Navigation} label="Out for Delivery" count={myDeliveries.filter((o) => o.status === 'out-for-delivery').length} />
                  {applySearch(myDeliveries)
                    .filter((o) => o.status === 'out-for-delivery')
                    .map((o) => (
                      <OrderCard key={o._id || o.id} order={o} onView={setViewOrder} highlight="green" actions={[]} />
                    ))}
                  <p className="text-xs text-center text-muted-foreground pb-1">
                    Scan the barcode at the customer's location to confirm delivery
                  </p>
                </div>
              )}


              {/* Available Deliveries */}
              {applySearch(availableDeliveries).length > 0 && (
                <div className="space-y-2">
                  <SectionLabel icon={PackageCheck} label="Available Deliveries" count={availableDeliveries.length} />
                  {applySearch(availableDeliveries).map((o) => (
                    <OrderCard
                      key={o._id || o.id}
                      order={o}
                      onView={setViewOrder}
                      actions={[{
                        label: 'Accept Delivery',
                        icon: PackageCheck,
                        loading: actionLoading[`delivery-${o._id || o.id}`],
                        onClick: () => acceptDelivery(o),
                      }]}
                    />
                  ))}
                </div>
              )}

              {applySearch(availableDeliveries).length === 0 && applySearch(myDeliveries).length === 0 && (
                <EmptyState icon={PackageCheck} message="No delivery orders available" />
              )}
            </>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4 — DELIVERED
        ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="delivered" className="mt-4 space-y-4">
          {/* Date chips */}
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

          {/* Stats */}
          {!loading && filteredDelivered.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{deliveredStats.count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Delivered</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-2xl font-bold">{deliveredStats.paid}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Paid</p>
              </CardContent></Card>
              <Card><CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                  ₦{deliveredStats.total.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Delivery Fees</p>
              </CardContent></Card>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)}</div>
          ) : filteredDelivered.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="No delivered orders yet" />
          ) : (
            <div className="space-y-2">
              {filteredDelivered.map((o) => (
                <DeliveredCard key={o._id || o.id} order={o} onView={setViewOrder} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Scan modals */}
      {scanMode && (
        <ScanModal
          open={!!scanMode}
          onOpenChange={(v) => { if (!v) setScanMode(null); }}
          mode={scanMode}
        />
      )}

      {/* Detail modal */}
      <OrderDetailModal
        order={viewOrder}
        open={!!viewOrder}
        onOpenChange={(v) => { if (!v) setViewOrder(null); }}
      />
    </div>
  );
}
