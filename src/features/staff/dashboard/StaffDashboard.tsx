// ============================================================================
// STAFF DASHBOARD - Staff Overview Page
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock, Package, CheckCircle, AlertCircle, Calendar, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useFetchAnnouncements,
  AnnouncementBanners,
  AnnouncementPopups,
} from '@/components/shared/AnnouncementSystem';

// ============================================================================
// HELPERS
// ============================================================================

// Convert "HH:MM" 24h string → "H:MM AM/PM"
function to12h(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft:              'Draft',
  pending:            'Pending',
  confirmed:          'Confirmed',
  in_progress:        'In Progress',
  'picked-up':        'Picked Up',
  washing:            'Washing',
  ironing:            'Ironing',
  ready:              'Ready',
  'out-for-delivery': 'Out for Delivery',
  delivered:          'Delivered',
  completed:          'Completed',
  cancelled:          'Cancelled',
};

function StatusBadge({ status }: { status: string }) {
  const label   = STATUS_LABELS[status] ?? status;
  const variant =
    status === 'cancelled'                          ? 'destructive'
    : status === 'completed' || status === 'ready'  ? 'default'
    : 'secondary';
  return <Badge variant={variant} className="capitalize text-xs">{label}</Badge>;
}

function customerName(order: any): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}

function isToday(dateStr: string) {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { banners, popups } = useFetchAnnouncements();

  const [activeOrders, setActiveOrders]     = useState<any[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [todayShift, setTodayShift]         = useState<any>(null);
  const [isLoading, setIsLoading]           = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const todayStr = new Date().toISOString().slice(0, 10);

      const [activeRes, completedRes, shiftsRes] = await Promise.all([
        // tab=mine → assigned to me, not completed/cancelled
        apiClient.get('/orders', { params: { tab: 'mine', limit: 10 } }),
        // completed orders assigned to me — filter by today client-side
        apiClient.get('/orders', { params: { assignedStaff: 'me', status: 'completed', limit: 50 } }),
        // shifts from today onwards
        apiClient.get('/staff/shifts/me', { params: { startDate: todayStr } }),
      ]);

      const active: any[]    = activeRes.data.data?.orders    ?? activeRes.data.data    ?? [];
      const completed: any[] = completedRes.data.data?.orders ?? completedRes.data.data ?? [];
      const shifts: any[]    = shiftsRes.data.data?.shifts    ?? shiftsRes.data.data    ?? [];

      // Count completed orders updated today
      const todayCompletedCount = completed.filter((o: any) => isToday(o.updatedAt ?? '')).length;

      // Find today's shift by exact date string match
      const shift = shifts.find((s: any) => s.startDate === todayStr) ?? null;

      setActiveOrders(active);
      setCompletedToday(todayCompletedCount);
      setTodayShift(shift);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const assignedCount = activeOrders.length;
  const pendingCount  = activeOrders.filter((o: any) => o.status === 'pending').length;
  const recentOrders  = activeOrders.slice(0, 5);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Announcements ──────────────────────────────────────────────────── */}
      <AnnouncementBanners items={banners} />
      <AnnouncementPopups  items={popups} />

      {/* ── Welcome Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM dd, yyyy')} — here's your work summary
        </p>
      </div>

      {/* ── Quick Stats ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCount}</div>
            <p className="text-xs text-muted-foreground">Active assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">Orders finished today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Shift</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {todayShift ? (
              <>
                <div className="text-xl font-bold">
                  {to12h(todayShift.startTime)} – {to12h(todayShift.endTime)}
                </div>
                <p className="text-xs text-muted-foreground capitalize">
                  {todayShift.shiftType ?? 'shift'} · {todayShift.status ?? ''}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">No Shift</div>
                <p className="text-xs text-muted-foreground">Not scheduled today</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/staff/orders')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">My Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View and manage your assigned orders
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/staff/attendance')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Attendance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Clock in/out and view your schedule
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate('/staff/chat')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Chat Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Respond to customer messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Orders ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Active Orders</CardTitle>
              <CardDescription>Your most recent assigned orders</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/staff/orders')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No active orders assigned to you
            </p>
          ) : (
            <div className="space-y-0">
              {recentOrders.map((order: any, i) => (
                <div key={order._id ?? i}>
                  {i > 0 && <Separator />}
                  <div
                    className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
                    onClick={() => navigate('/staff/orders')}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {order.orderNumber ?? '—'}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {customerName(order)}
                        {order.createdAt && (
                          <> · {format(new Date(order.createdAt), 'MMM dd, yyyy')}</>
                        )}
                      </p>
                    </div>
                    {/* Service type(s) */}
                    <div className="flex flex-wrap gap-1 justify-end max-w-[160px]">
                      {[...new Set(
                        (order.items ?? [])
                          .map((it: any) => it.serviceType)
                          .filter(Boolean) as string[]
                      )].map((s: string) => (
                        <Badge key={s} variant="outline" className="capitalize text-xs">
                          {s.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
