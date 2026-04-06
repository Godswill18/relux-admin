// ============================================================================
// ADMIN ORDERS PAGE — 11-Status Workflow
// Tabs: Pending · Confirmed · Picked Up · In Progress · Washing · Ironing ·
//       Ready · Out for Delivery · Delivered · Completed · Cancelled
// ============================================================================

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, MoreHorizontal, Eye, Edit, Trash, UserPlus, ScanLine,
  CheckCircle2, Search, Package, User,
  Clock, Check, Truck, Settings2, Waves, Zap,
  PackageCheck, Navigation, Home, XCircle,
} from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { EditOrderModal } from './EditOrderModal';
import { AssignStaffModal } from './AssignStaffModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { CountdownBadge } from '@/components/shared/CountdownBadge';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatusBadge, PaymentStatusBadge, PriorityBadge } from '@/components/shared/StatusBadges';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';

// ============================================================================
// CONSTANTS
// ============================================================================

type StatusKey =
  | 'pending' | 'confirmed' | 'picked-up' | 'in_progress'
  | 'washing' | 'ironing' | 'ready' | 'out-for-delivery'
  | 'delivered' | 'completed' | 'cancelled';

const STATUS_TABS: {
  key: StatusKey;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: 'pending',          label: 'Pending',          icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'confirmed',        label: 'Confirmed',        icon: <Check className="h-3.5 w-3.5" /> },
  { key: 'picked-up',        label: 'Picked Up',        icon: <Truck className="h-3.5 w-3.5" /> },
  { key: 'in_progress',      label: 'In-Progress',      icon: <Settings2 className="h-3.5 w-3.5" /> },
  { key: 'washing',          label: 'Washing',          icon: <Waves className="h-3.5 w-3.5" /> },
  { key: 'ironing',          label: 'Ironing',          icon: <Zap className="h-3.5 w-3.5" /> },
  { key: 'ready',            label: 'Ready',            icon: <PackageCheck className="h-3.5 w-3.5" /> },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: <Navigation className="h-3.5 w-3.5" /> },
  { key: 'delivered',        label: 'Delivered',        icon: <Home className="h-3.5 w-3.5" /> },
  { key: 'completed',        label: 'Completed',        icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { key: 'cancelled',        label: 'Cancelled',        icon: <XCircle className="h-3.5 w-3.5" /> },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function OrdersPage() {
  const navigate = useNavigate();
  const canCreate = useHasPermission(Permission.CREATE_ORDER);
  const canEdit   = useHasPermission(Permission.EDIT_ORDER);
  const canAssign = useHasPermission(Permission.ASSIGN_STAFF);
  const canDelete = useHasPermission(Permission.DELETE_ORDER);

  const [activeTab,    setActiveTab]    = useState<StatusKey>('pending');
  const [orders,       setOrders]       = useState<any[]>([]);
  const [counts,       setCounts]       = useState<Record<string, number>>({});
  const [isLoading,    setIsLoading]    = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [listKey,      setListKey]      = useState(0);
  const [search,       setSearch]       = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [scannerOpen,  setScannerOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Fetch DB counts per status ───────────────────────────────────────────
  const fetchCounts = useCallback(() => {
    apiClient.get('/orders/counts')
      .then((res) => { if (res.data?.data) setCounts(res.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [fetchCounts, refreshKey]);

  // Socket: update counts instantly on order changes
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const handler = () => fetchCounts();
    socket.on('order:created',        handler);
    socket.on('order:assigned',       handler);
    socket.on('order:status-updated', handler);
    socket.on('order:updated',        handler);
    return () => {
      socket.off('order:created',        handler);
      socket.off('order:assigned',       handler);
      socket.off('order:status-updated', handler);
      socket.off('order:updated',        handler);
    };
  }, [fetchCounts]);

  // Socket: refresh list when order changes in active tab
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const handler = () => setListKey((k) => k + 1);
    socket.on('order:created',        handler);
    socket.on('order:assigned',       handler);
    socket.on('order:status-updated', handler);
    return () => {
      socket.off('order:created',        handler);
      socket.off('order:assigned',       handler);
      socket.off('order:status-updated', handler);
    };
  }, []);

  // Socket: update deadline fields in-place without refetch (order:timer-updated)
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    const handler = (data: { orderId: string; stageDeadlineAt: string | null; stageDurationMinutes: number | null }) => {
      setOrders((prev) =>
        prev.map((o) =>
          (o._id === data.orderId || o.id === data.orderId)
            ? { ...o, stageDeadlineAt: data.stageDeadlineAt, stageDurationMinutes: data.stageDurationMinutes }
            : o
        )
      );
    };
    socket.on('order:timer-updated', handler);
    return () => { socket.off('order:timer-updated', handler); };
  }, []);

  // ── Fetch orders for active tab ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      setSearch('');
      try {
        const res = await apiClient.get('/orders', {
          params: { statusTab: activeTab, limit: '100' },
        });
        if (!cancelled) {
          const raw = res.data?.data;
          setOrders(Array.isArray(raw) ? raw : raw?.orders ?? []);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [activeTab, refreshKey, listKey]);

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) => {
      const num  = (o.orderNumber ?? '').toLowerCase();
      const name = (o.customer?.name ?? o.walkInCustomer?.name ?? '').toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [orders, search]);

  const handleMarkCompleted = async (order: any) => {
    try {
      await apiClient.patch(`/orders/${order._id}/status`, { status: 'completed' });
      toast.success(`Order ${order.orderNumber} marked as Completed`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/orders/${deleteTarget._id || deleteTarget.id}`);
      toast.success('Order deleted');
      setDeleteTarget(null);
      refresh();
    } catch {
      toast.error('Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium font-mono">{row.original.orderNumber || '—'}</span>
          <PriorityBadge serviceLevel={row.original.serviceLevel} rush={row.original.rush} />
        </div>
      ),
    },
    {
      id: 'customer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.customer?.name || row.original.walkInCustomer?.name || '—'}</div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {row.original.orderSource === 'offline' ? 'Walk-in' : 'Online'}
            </span>
            <CreatedByBadge role={row.original.createdByRole} source={row.original.orderSource} />
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        return (
          <div className="text-sm">
            <div>{items[0]?.itemType || items[0]?.serviceName || '—'}</div>
            {items.length > 1 && (
              <div className="text-xs text-muted-foreground">+{items.length - 1} more</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total || row.original.total || 0;
        return <div className="font-medium">₦{total.toLocaleString()}</div>;
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const ps = row.original.paymentStatus || row.original.payment?.status || 'unpaid';
        return <PaymentStatusBadge status={ps} />;
      },
    },
    {
      id: 'assignedStaff',
      header: 'Assigned To',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.assignedStaff?.name || (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      id: 'timer',
      header: 'Timer',
      cell: ({ row }) => (
        <CountdownBadge
          stageDeadlineAt={row.original.stageDeadlineAt}
          stageDurationMinutes={row.original.stageDurationMinutes}
          variant="compact"
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.createdAt ? format(new Date(row.original.createdAt), 'MMM dd, yyyy') : '—'}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-1">
            {activeTab === 'delivered' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                onClick={() => handleMarkCompleted(order)}
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Mark Completed
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate(`/admin/orders/${order._id}`)}>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={() => setEditTarget(order)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Order
                  </DropdownMenuItem>
                )}
                {canAssign && (
                  <DropdownMenuItem onClick={() => setAssignTarget(order)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Assign Staff
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(order)}>
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Summary stats derived from counts
  const activeCount    = (counts.active ?? 0);
  const pendingCount   = (counts.pending ?? 0);
  const inWorkCount    = (['washing','ironing','in_progress','confirmed','picked-up'] as StatusKey[])
    .reduce((s, k) => s + (counts[k] ?? 0), 0);
  const deliveredCount = (counts.delivered ?? 0) + (counts.completed ?? 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">11-stage laundry workflow</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setScannerOpen(true)}>
            <ScanLine className="mr-2 h-4 w-4" /> Scan
          </Button>
          {canCreate && (
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Order
            </Button>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <CreateOrderModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={refresh} />
      <EditOrderModal
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        order={editTarget}
      />
      <AssignStaffModal
        open={!!assignTarget}
        onOpenChange={(o) => !o && setAssignTarget(null)}
        order={assignTarget}
      />
      <BarcodeScannerModal open={scannerOpen} onOpenChange={setScannerOpen} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Order"
        description={<>Delete order <strong>{deleteTarget?.orderNumber}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* ── Summary Stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Active Orders',  value: activeCount,    desc: 'Not delivered/cancelled' },
          { label: 'Pending',        value: pendingCount,   desc: 'Awaiting staff pickup' },
          { label: 'In Workflow',    value: inWorkCount,    desc: 'Being processed' },
          { label: 'Delivered',      value: deliveredCount, desc: 'Done & completed' },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs sm:text-sm font-medium">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 11-Status Tab Strip ─────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusKey)}>
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="flex w-max gap-0.5">
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.key] ?? 0;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex items-center gap-1.5 text-xs whitespace-nowrap px-3 py-1.5"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.label.split(' ')[0]}
                  </span>
                  {count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.key} value={tab.key} className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or customer name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-12">
                    <Package className="h-10 w-10 text-muted-foreground opacity-40" />
                    <p className="text-sm text-muted-foreground">No {tab.label.toLowerCase()} orders</p>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map((order) => (
                  <AdminMobileCard
                    key={order._id}
                    order={order}
                    canEdit={canEdit}
                    canAssign={canAssign}
                    canDelete={canDelete}
                    showComplete={tab.key === 'delivered'}
                    onView={() => navigate(`/admin/orders/${order._id}`)}
                    onEdit={() => setEditTarget(order)}
                    onAssign={() => setAssignTarget(order)}
                    onDelete={() => setDeleteTarget(order)}
                    onMarkCompleted={() => handleMarkCompleted(order)}
                  />
                ))
              )}
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tab.icon} {tab.label}
                </CardTitle>
                <CardDescription>
                  {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={filteredOrders}
                  searchKey={undefined}
                  isLoading={isLoading}
                  onRowClick={(o: any) => navigate(`/admin/orders/${o._id}`)}
                  showColumnVisibility
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ============================================================================
// MOBILE CARD
// ============================================================================

interface AdminMobileCardProps {
  order: any;
  canEdit: boolean; canAssign: boolean; canDelete: boolean;
  showComplete?: boolean;
  onView: () => void; onEdit: () => void; onAssign: () => void; onDelete: () => void;
  onMarkCompleted?: () => void;
}

function AdminMobileCard({ order, canEdit, canAssign, canDelete, showComplete, onView, onEdit, onAssign, onDelete, onMarkCompleted }: AdminMobileCardProps) {
  const isWalkIn     = order.orderSource === 'offline';
  const customerName = order.customer?.name || order.walkInCustomer?.name || '—';
  const items: any[] = order.items || [];
  const total        = order.pricing?.total || order.total || 0;
  const payStatus    = order.paymentStatus || order.payment?.status || 'unpaid';
  const createdAt    = order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : '—';

  return (
    <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={onView}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm font-mono">{order.orderNumber || '—'}</span>
              <PriorityBadge serviceLevel={order.serviceLevel} rush={order.rush} />
              {isWalkIn && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Walk-in</Badge>}
              <CreatedByBadge role={order.createdByRole} source={order.orderSource} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{customerName}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {canAssign && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(); }}>
                  <UserPlus className="mr-2 h-4 w-4" /> Assign Staff
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <Trash className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {items[0].itemType || items[0].serviceName || '—'}
              {items.length > 1 && ` +${items.length - 1} more`}
            </span>
          </div>
        )}

        {order.stageDeadlineAt && (
          <CountdownBadge
            stageDeadlineAt={order.stageDeadlineAt}
            stageDurationMinutes={order.stageDurationMinutes}
            variant="compact"
          />
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={payStatus} />
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm">₦{total.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">{createdAt}</div>
          </div>
        </div>

        {showComplete && (
          <Button
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={(e) => { e.stopPropagation(); onMarkCompleted?.(); }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Mark as Completed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CREATED BY BADGE — shows who originated the order
// ============================================================================

function CreatedByBadge({ role, source }: { role?: string; source?: string }) {
  if (source === 'online' && (!role || role === 'customer')) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0 text-[10px] font-medium border border-blue-200 dark:border-blue-800">
        Online
      </span>
    );
  }
  if (role === 'admin' || role === 'manager' || role === 'receptionist') {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0 text-[10px] font-medium border border-violet-200 dark:border-violet-800">
        Admin
      </span>
    );
  }
  if (role === 'staff') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0 text-[10px] font-medium border border-amber-200 dark:border-amber-800">
        Staff
      </span>
    );
  }
  return null;
}
