// ============================================================================
// DELIVERY DASHBOARD - Metric cards for the delivery role
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch, Truck, Clock, CheckCircle2, CalendarClock, PackageCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/useAuthStore';
import { OrderStatusBadge } from '@/components/shared/StatusBadges';
import { format, isSameDay } from 'date-fns';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';

// ============================================================================
// METRIC CARD
// ============================================================================

function MetricCard({
  title, value, icon: Icon, accentColor, onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  accentColor: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders', { params: { limit: 200 } });
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

  const today = new Date();

  // ── Metrics ────────────────────────────────────────────────────────────────
  const pickedUp       = orders.filter((o) => ['picked-up', 'in_progress', 'washing', 'ironing', 'ready', 'out-for-delivery'].includes(o.status));
  const delivered      = orders.filter((o) => ['delivered', 'completed'].includes(o.status));
  const pendingPickup  = orders.filter((o) => ['pending', 'confirmed', 'pending-pickup'].includes(o.status) && o.addOns?.pickup);
  const pendingDelivery = orders.filter((o) => o.status === 'ready' || o.status === 'out-for-delivery');
  const todayPickups   = orders.filter((o) => o.actualPickupDate && isSameDay(new Date(o.actualPickupDate), today));
  const todayDeliveries = orders.filter((o) => o.actualDeliveryDate && isSameDay(new Date(o.actualDeliveryDate), today));

  // ── Ready for delivery (highlight) ────────────────────────────────────────
  const readyForDelivery = orders.filter((o) => o.status === 'ready');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Delivery Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {format(today, 'EEEE, MMMM dd, yyyy')} · Welcome, {user?.name}
          </p>
        </div>
        <Button onClick={() => navigate('/delivery/orders')}>
          <PackageSearch className="mr-2 h-4 w-4" />
          View Orders
        </Button>
      </div>

      {/* Ready for delivery alert */}
      {readyForDelivery.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-4 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
          onClick={() => navigate('/delivery/orders?tab=delivery-only')}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {readyForDelivery.length} order{readyForDelivery.length !== 1 ? 's' : ''} ready for delivery!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Clothes are processed and waiting — tap to view
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white shrink-0">Ready</Badge>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <MetricCard
          title="Total Picked Up"
          value={pickedUp.length}
          icon={Truck}
          accentColor="#6366f1"
          onClick={() => navigate('/delivery/orders?tab=pickup-delivery')}
        />
        <MetricCard
          title="Total Delivered"
          value={delivered.length}
          icon={CheckCircle2}
          accentColor="#10b981"
        />
        <MetricCard
          title="Pending Pickups"
          value={pendingPickup.length}
          icon={Clock}
          accentColor="#f59e0b"
          onClick={() => navigate('/delivery/orders?tab=pickup-delivery')}
        />
        <MetricCard
          title="Pending Deliveries"
          value={pendingDelivery.length}
          icon={PackageSearch}
          accentColor="#8b5cf6"
          onClick={() => navigate('/delivery/orders?tab=delivery-only')}
        />
        <MetricCard
          title="Today's Pickups"
          value={todayPickups.length}
          icon={CalendarClock}
          accentColor="#3b82f6"
        />
        <MetricCard
          title="Today's Deliveries"
          value={todayDeliveries.length}
          icon={PackageCheck}
          accentColor="#22c55e"
        />
      </div>

      {/* Recent activity */}
      {orders.filter((o) => ['out-for-delivery', 'picked-up'].includes(o.status)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Progress</h2>
          <div className="space-y-2">
            {orders
              .filter((o) => ['out-for-delivery', 'picked-up'].includes(o.status))
              .slice(0, 5)
              .map((o) => {
                const customer = o.customer || o.walkInCustomer;
                return (
                  <div
                    key={o._id}
                    className="flex items-center justify-between rounded-lg border p-3 gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => navigate('/delivery/orders')}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{customer?.name ?? 'Walk-in'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {o.deliveryAddress && (
                        <p className="text-xs text-muted-foreground hidden sm:block truncate max-w-[140px]">{o.deliveryAddress}</p>
                      )}
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
