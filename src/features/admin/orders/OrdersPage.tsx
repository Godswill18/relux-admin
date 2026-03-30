// ============================================================================
// ORDERS PAGE - Main Order Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Eye, Edit, Trash, UserPlus, ScanLine, CheckCircle2 } from 'lucide-react';
import { CreateOrderModal } from './CreateOrderModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
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
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';


// ============================================================================
// ORDERS PAGE COMPONENT
// ============================================================================

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders, isLoading, fetchOrders, setSelectedOrder, deleteOrder } = useOrderStore();
  const canCreate = useHasPermission(Permission.CREATE_ORDER);
  const canEdit = useHasPermission(Permission.EDIT_ORDER);
  const canAssign = useHasPermission(Permission.ASSIGN_STAFF);
  const canDelete = useHasPermission(Permission.DELETE_ORDER);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch orders on mount
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

  // Define columns
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
        <div className="text-sm">{row.original.customer?.name || '—'}</div>
      ),
    },
    {
      accessorKey: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        const itemCount = items.length;
        const firstItem = items[0];
        return (
          <div className="text-sm">
            <div>{firstItem?.itemType || firstItem?.serviceName || '—'}</div>
            {itemCount > 1 && (
              <div className="text-xs text-muted-foreground">
                +{itemCount - 1} more
              </div>
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
        const paymentStatus = row.original.payment?.status || row.original.paymentStatus || 'unpaid';
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

  // Calculate stats
  const orderList: any[] = Array.isArray(orders) ? orders : [];
  const stats = {
    total: orderList.length,
    pending: orderList.filter((o) => o.status === 'pending').length,
    inProgress: orderList.filter((o) => ['in_progress', 'washing', 'ironing'].includes(o.status)).length,
    revenue: orderList
      .filter((o) => o.payment?.status === 'paid')
      .reduce((sum, o) => sum + (o.pricing?.total || o.total || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Manage all laundry orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/orders/delivered')}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Delivered
          </Button>
          <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
            <ScanLine className="mr-2 h-4 w-4" />
            Scan Delivery
          </Button>
          {canCreate && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Paid)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{stats.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>View and manage all customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={Array.isArray(orders) ? orders : []}
            searchKey="orderNumber"
            searchPlaceholder="Search by order number or customer name..."
            isLoading={isLoading}
            onRowClick={(order: any) => navigate(`/admin/orders/${order._id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
