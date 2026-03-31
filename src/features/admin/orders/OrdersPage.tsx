// ============================================================================
// ORDERS PAGE - Main Order Management Interface
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, MoreHorizontal, Eye, Edit, Trash, UserPlus, ScanLine,
  CheckCircle2, Search, Package, User,
} from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrderStore } from '@/stores/useOrderStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// ORDERS PAGE COMPONENT
// ============================================================================

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders, isLoading, isFetchingMore, hasMore, fetchOrders, loadMoreOrders, setSelectedOrder, deleteOrder } = useOrderStore();
  const canCreate = useHasPermission(Permission.CREATE_ORDER);
  const canEdit = useHasPermission(Permission.EDIT_ORDER);
  const canAssign = useHasPermission(Permission.ASSIGN_STAFF);
  const canDelete = useHasPermission(Permission.DELETE_ORDER);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteOrder(deleteTarget._id || deleteTarget.id);
      toast.success('Order deleted successfully');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  };

  const orderList: any[] = Array.isArray(orders) ? orders : [];

  // Filtered list shared by both mobile cards and desktop table
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orderList;
    return orderList.filter((o) => {
      const num = (o.orderNumber ?? '').toLowerCase();
      const name = (o.customer?.name ?? o.walkInCustomer?.name ?? '').toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [orderList, search]);

  // Stats
  const stats = {
    total: orderList.length,
    pending: orderList.filter((o) => o.status === 'pending').length,
    inProgress: orderList.filter((o) =>
      ['in_progress', 'washing', 'ironing'].includes(o.status)
    ).length,
    revenue: orderList
      .filter((o) => o.payment?.status === 'paid')
      .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0),
  };

  // Desktop table columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.orderNumber || row.original.code || '—'}</div>
      ),
    },
    {
      id: 'customer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.customer?.name || row.original.walkInCustomer?.name || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const firstItem = items[0];
        return (
          <div className="text-sm">
            <div>{firstItem?.itemType || firstItem?.serviceName || '—'}</div>
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
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: 'payment',
      header: 'Payment',
      cell: ({ row }) => {
        const paymentStatus =
          row.original.payment?.status || row.original.paymentStatus || 'unpaid';
        return <PaymentStatusBadge status={paymentStatus} />;
      },
    },
    {
      id: 'assignedStaff',
      header: 'Assigned To',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.assignedStaff?.name || (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {date ? format(new Date(date), 'MMM dd, yyyy') : '—'}
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
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/admin/orders/${order._id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Order
                </DropdownMenuItem>
              )}
              {canAssign && (
                <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Staff
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(order)}
                    className="text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm">Manage all laundry orders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => navigate('/admin/orders/delivered')}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Delivered
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setIsScannerOpen(true)}
          >
            <ScanLine className="mr-2 h-4 w-4" />
            Scan
          </Button>
          {canCreate && (
            <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          )}
        </div>
      </div>

      <CreateOrderModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <BarcodeScannerModal open={isScannerOpen} onOpenChange={setIsScannerOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Order"
        description={
          <>
            Are you sure you want to delete order{' '}
            <strong>{deleteTarget?.orderNumber || deleteTarget?.code}</strong>? This action cannot
            be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue (Paid)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold">₦{stats.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search (shared between mobile + desktop) ─────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number or customer name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Mobile Card List + load-more (hidden on md+) ────────────────────── */}
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
            <MobileOrderCard
              key={order._id}
              order={order}
              canEdit={canEdit}
              canAssign={canAssign}
              canDelete={canDelete}
              onView={() => navigate(`/admin/orders/${order._id}`)}
              onEdit={() => setSelectedOrder(order)}
              onAssign={() => setSelectedOrder(order)}
              onDelete={() => setDeleteTarget(order)}
            />
          ))
        )}
        <LoadMoreTrigger
          onIntersect={loadMoreOrders}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
        />
      </div>

      {/* ── Desktop Table (hidden on mobile) ────────────────────────────────── */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>View and manage all customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredOrders}
            searchKey={undefined}
            searchPlaceholder="Search by order number or customer name..."
            isLoading={isLoading}
            onRowClick={(order: any) => navigate(`/admin/orders/${order._id}`)}
            showColumnVisibility
          />
        </CardContent>
      </Card>
      <LoadMoreTrigger
        onIntersect={loadMoreOrders}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
      />
    </div>
  );
}

// ============================================================================
// MOBILE ORDER CARD
// ============================================================================

interface MobileOrderCardProps {
  order: any;
  canEdit: boolean;
  canAssign: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onDelete: () => void;
}

function MobileOrderCard({
  order,
  canEdit,
  canAssign,
  canDelete,
  onView,
  onEdit,
  onAssign,
  onDelete,
}: MobileOrderCardProps) {
  const isWalkIn = order.orderSource === 'offline';
  const customerName =
    order.customer?.name || order.walkInCustomer?.name || '—';
  const items: any[] = order.items || [];
  const total = order.pricing?.total || order.total || 0;
  const paymentStatus = order.payment?.status || order.paymentStatus || 'unpaid';
  const createdAt = order.createdAt
    ? format(new Date(order.createdAt), 'MMM dd, yyyy')
    : '—';

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onView}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: order number + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{order.orderNumber || '—'}</span>
              {isWalkIn && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Walk-in</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{customerName}</span>
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Order
                </DropdownMenuItem>
              )}
              {canAssign && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign(); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Staff
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {items[0].itemType || items[0].serviceName || '—'}
              {items.length > 1 && ` +${items.length - 1} more`}
            </span>
          </div>
        )}

        {/* Bottom row: status + payment + total + date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={paymentStatus} />
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm">₦{total.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">{createdAt}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
