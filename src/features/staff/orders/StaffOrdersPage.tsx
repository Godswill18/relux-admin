// ============================================================================
// STAFF ORDERS PAGE
// Tabs: New Orders · My Orders · Online · Walk-in · Completed
// Badge counts fetched on load + auto-refreshed every 30 s (staff-specific)
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal, Plus, CheckCircle, Edit, Eye, Archive,
  Package, User, Search, ClipboardList, Layers, CheckCircle2,
  ScanLine, Globe, Store,
} from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
import { UpdateStatusModal } from './UpdateStatusModal';
import { StaffOrderDetailModal } from './StaffOrderDetailModal';
import { CreateOrderModal } from '@/features/admin/orders/CreateOrderModal';
import { BarcodeScannerModal } from '@/features/admin/orders/BarcodeScannerModal';
import { OrderReceiptModal } from '@/features/admin/orders/OrderReceiptModal';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

// ============================================================================
// HELPERS
// ============================================================================

const SERVICE_LABELS: Record<string, string> = {
  'wash-fold': 'Wash & Fold',
  'wash-iron': 'Wash & Iron',
  'iron-only': 'Iron Only',
  'dry-clean': 'Dry Clean',
};

function customerName(order: any): string {
  return order.walkInCustomer?.name || order.customer?.name || '—';
}
function customerPhone(order: any): string {
  return order.walkInCustomer?.phone || order.customer?.phone || '—';
}

// ============================================================================
// TYPES
// ============================================================================

type TabKey = 'new' | 'mine' | 'online' | 'walkin' | 'completed';

interface StaffCounts {
  new: number;
  mine: number;
  online: number;
  walkin: number;
  completed: number;
}

// API params per tab
const TAB_PARAMS: Record<TabKey, Record<string, string>> = {
  new:       { tab: 'new',     limit: '100' },
  mine:      { tab: 'mine',    limit: '100' },
  online:    { assignedStaff: 'me', orderSource: 'online',  excludeCompleted: 'true', limit: '100' },
  walkin:    { tab: 'offline', limit: '100' },
  completed: { tab: 'completed', limit: '100' },
};

// ============================================================================
// SHARED BASE COLUMNS
// ============================================================================

function baseColumns(): ColumnDef<any>[] {
  return [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-sm">
          {row.original.orderNumber ?? '—'}
        </span>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{customerName(row.original)}</div>
          <div className="text-xs text-muted-foreground">{customerPhone(row.original)}</div>
        </div>
      ),
    },
    {
      id: 'service',
      header: 'Service(s)',
      cell: ({ row }) => {
        const items: any[] = row.original.items ?? [];
        const services =
          items.length > 0
            ? [...new Set(items.map((i: any) => i.serviceType).filter(Boolean))]
            : row.original.serviceType
            ? [row.original.serviceType]
            : [];
        if (services.length === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {services.map((s: string) => (
              <Badge key={s} variant="outline" className="capitalize text-xs whitespace-nowrap">
                {SERVICE_LABELS[s] ?? s.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) =>
        row.original.createdAt
          ? format(new Date(row.original.createdAt), 'MMM dd, yyyy')
          : '—',
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffOrdersPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]   = useState<TabKey>('new');
  const [orders, setOrders]         = useState<any[]>([]);
  const [counts, setCounts]         = useState<StaffCounts>({ new: 0, mine: 0, online: 0, walkin: 0, completed: 0 });
  const [isLoading, setIsLoading]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch]         = useState('');

  // Modals
  const [detailOrder,  setDetailOrder]  = useState<any>(null);
  const [acceptTarget, setAcceptTarget] = useState<any>(null);
  const [isAccepting,  setIsAccepting]  = useState(false);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [offlineOpen,  setOfflineOpen]  = useState(false);
  const [scannerOpen,  setScannerOpen]  = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Fetch staff-specific tab counts ────────────────────────────────────────
  const fetchCounts = useCallback(() => {
    apiClient.get('/orders/staff-counts')
      .then((res) => {
        const d = res.data?.data;
        if (d) setCounts(d);
      })
      .catch(() => {});
  }, []);

  // Fetch counts on mount, on refresh, and auto-refresh every 30 s
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [fetchCounts, refreshKey]);

  // ── Fetch orders for the active tab ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchOrders = async () => {
      setIsLoading(true);
      setSearch('');
      try {
        const res = await apiClient.get('/orders', { params: TAB_PARAMS[activeTab] });
        if (!cancelled) {
          const raw = res.data.data;
          setOrders(Array.isArray(raw) ? raw : raw?.orders ?? []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchOrders();
    return () => { cancelled = true; };
  }, [activeTab, refreshKey]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) => {
      const num  = (o.orderNumber ?? '').toLowerCase();
      const name = customerName(o).toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [orders, search]);

  // ── Stats (current tab + DB counts) ──────────────────────────────────────
  const stats = useMemo(() => ({
    total:      counts.mine,                       // my assigned undelivered (DB-accurate)
    inProgress: orders.filter((o) =>
      ['in_progress', 'washing', 'ironing', 'confirmed'].includes(o.status)
    ).length,
    ready: orders.filter((o) => o.status === 'ready').length,
  }), [orders, counts.mine]);

  // ── Accept / pick an order ────────────────────────────────────────────────
  const handleConfirmAccept = async () => {
    if (!acceptTarget) return;
    try {
      setIsAccepting(true);
      await apiClient.patch(`/orders/${acceptTarget._id}/accept`);
      toast.success(`Order ${acceptTarget.orderNumber} accepted`);
      setAcceptTarget(null);
      refresh();
      setActiveTab('mine');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept order');
    } finally {
      setIsAccepting(false);
    }
  };

  // ── Column definitions ─────────────────────────────────────────────────────

  const newOrderColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Button size="sm" onClick={() => setAcceptTarget(order)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Pick Order
          </Button>
        );
      },
    },
  ];

  const activeOrderColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? row.original.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const status = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return <PaymentStatusBadge status={status} />;
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusTarget(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const walkinColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const method = row.original.payment?.method ?? '—';
        const status = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return (
          <div>
            <div className="text-xs capitalize text-muted-foreground">{method}</div>
            <PaymentStatusBadge status={status} />
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusTarget(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const completedColumns: ColumnDef<any>[] = [
    ...baseColumns(),
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total ?? row.original.total ?? 0;
        return <span className="font-medium">₦{Number(total).toLocaleString()}</span>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const status = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return <PaymentStatusBadge status={status} />;
      },
    },
    {
      id: 'closedAt',
      header: 'Closed',
      cell: ({ row }) =>
        row.original.updatedAt
          ? format(new Date(row.original.updatedAt), 'MMM dd, yyyy')
          : '—',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setDetailOrder(row.original)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  // ── Tab config ─────────────────────────────────────────────────────────────

  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    description: string;
    columns: ColumnDef<any>[];
  }[] = [
    {
      key: 'new',
      label: 'New Orders',
      icon: <Package className="h-3.5 w-3.5" />,
      description: 'Unassigned orders available to pick up',
      columns: newOrderColumns,
    },
    {
      key: 'mine',
      label: 'My Orders',
      icon: <ClipboardList className="h-3.5 w-3.5" />,
      description: 'Orders currently assigned to you',
      columns: activeOrderColumns,
    },
    {
      key: 'online',
      label: 'Online',
      icon: <Globe className="h-3.5 w-3.5" />,
      description: 'Your assigned online / app orders',
      columns: activeOrderColumns,
    },
    {
      key: 'walkin',
      label: 'Walk-in',
      icon: <Store className="h-3.5 w-3.5" />,
      description: 'Walk-in orders you created',
      columns: walkinColumns,
    },
    {
      key: 'completed',
      label: 'Completed',
      icon: <Archive className="h-3.5 w-3.5" />,
      description: 'Orders you handled that are done',
      columns: completedColumns,
    },
  ];

  const activeTabConfig = tabs.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">Manage and track laundry orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate('/staff/orders/delivered')} className="flex-1 sm:flex-none">
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            Delivered
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)} className="flex-1 sm:flex-none">
            <ScanLine className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
          <Button onClick={() => setOfflineOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Create Walk-in Order
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">My Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Assigned to me</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.ready}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        {/* Scrollable tab strip */}
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max min-w-full sm:w-auto sm:min-w-0">
            {tabs.map((tab) => {
              const badgeCount = counts[tab.key];
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex-1 sm:flex-none flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap"
                >
                  {tab.icon}
                  {tab.label}
                  {badgeCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="space-y-4">
            {/* ── Search ────────────────────────────────────────────────── */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* ── Mobile Card List ──────────────────────────────────────── */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12">
                    <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No orders found</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => (
                  <StaffMobileOrderCard
                    key={order._id}
                    order={order}
                    tabKey={tab.key}
                    onView={() => setDetailOrder(order)}
                    onAccept={() => setAcceptTarget(order)}
                    onUpdateStatus={() => setStatusTarget(order)}
                  />
                ))
              )}
            </div>

            {/* ── Desktop Table ─────────────────────────────────────────── */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={tab.columns}
                  data={filteredOrders}
                  searchKey={undefined}
                  searchPlaceholder="Search by order number or customer name..."
                  isLoading={isLoading}
                  onRowClick={(row) => setDetailOrder(row)}
                  showColumnVisibility
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <StaffOrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => !open && setDetailOrder(null)}
        onViewReceipt={(order) => { setDetailOrder(null); setReceiptOrder(order); }}
      />

      <BarcodeScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        confirmPath="/staff/orders/delivery-confirm"
      />

      <OrderReceiptModal
        open={!!receiptOrder}
        onOpenChange={(open) => !open && setReceiptOrder(null)}
        order={receiptOrder}
      />

      <ConfirmDialog
        open={!!acceptTarget}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
        title="Pick Up Order"
        description={
          <>
            Assign order{' '}
            <span className="font-mono font-semibold">{acceptTarget?.orderNumber}</span> for{' '}
            <strong>{acceptTarget ? customerName(acceptTarget) : ''}</strong> to yourself?
          </>
        }
        confirmLabel="Pick Order"
        isLoading={isAccepting}
        onConfirm={handleConfirmAccept}
      />

      <UpdateStatusModal
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        order={statusTarget}
        onSuccess={refresh}
      />

      <CreateOrderModal
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        onSuccess={() => {
          refresh();
          setActiveTab('walkin');
        }}
      />
    </div>
  );
}

// ============================================================================
// STAFF MOBILE ORDER CARD
// ============================================================================

interface StaffMobileOrderCardProps {
  order: any;
  tabKey: TabKey;
  onView: () => void;
  onAccept: () => void;
  onUpdateStatus: () => void;
}

function StaffMobileOrderCard({
  order,
  tabKey,
  onView,
  onAccept,
  onUpdateStatus,
}: StaffMobileOrderCardProps) {
  const isWalkIn = order.orderSource === 'offline';
  const name = customerName(order);
  const items: any[] = order.items ?? [];
  const total = order.pricing?.total ?? order.total ?? 0;
  const paymentStatus = order.paymentStatus || order.payment?.status || 'unpaid';
  const createdAt = order.createdAt
    ? format(new Date(order.createdAt), 'MMM dd, yyyy')
    : '—';

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onView}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: order number + actions menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm font-mono">
                {order.orderNumber ?? '—'}
              </span>
              {isWalkIn && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Walk-in
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {tabKey === 'new' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAccept(); }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Pick Order
                </DropdownMenuItem>
              )}
              {(tabKey === 'mine' || tabKey === 'online' || tabKey === 'walkin') && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Status
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {items[0].itemType || items[0].serviceName || SERVICE_LABELS[items[0].serviceType] || '—'}
              {items.length > 1 && ` +${items.length - 1} more`}
            </span>
          </div>
        )}

        {/* Bottom row: status + payment + total + date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <OrderStatusBadge status={order.status} />
            {(tabKey === 'mine' || tabKey === 'online' || tabKey === 'walkin' || tabKey === 'completed') && (
              <PaymentStatusBadge status={paymentStatus} />
            )}
          </div>
          <div className="text-right">
            {total > 0 && (
              <div className="font-semibold text-sm">₦{Number(total).toLocaleString()}</div>
            )}
            <div className="text-[11px] text-muted-foreground">{createdAt}</div>
          </div>
        </div>

        {/* Pick Order button for new-orders tab */}
        {tabKey === 'new' && (
          <Button
            size="sm"
            className="w-full"
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Pick Order
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
