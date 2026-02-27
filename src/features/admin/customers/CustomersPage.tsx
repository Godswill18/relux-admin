// ============================================================================
// CUSTOMERS PAGE - Customer Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, MoreHorizontal, Eye, Edit, Trash, Wallet, Award } from 'lucide-react';
import { AddCustomerModal } from './AddCustomerModal';
import { ViewCustomerModal } from './ViewCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { ManageWalletModal } from './ManageWalletModal';
import { AdjustLoyaltyModal } from './AdjustLoyaltyModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { CustomerActiveBadge, CustomerAccountStatusBadge } from '@/components/shared/StatusBadges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';


// ============================================================================
// CUSTOMERS PAGE COMPONENT
// ============================================================================

export default function CustomersPage() {
  const { customers, isLoading, fetchCustomers, deleteCustomer } = useCustomerStore();
  const canCreate = useHasPermission(Permission.CREATE_CUSTOMER);
  const canEdit = useHasPermission(Permission.EDIT_CUSTOMER);
  const canDelete = useHasPermission(Permission.DELETE_CUSTOMER);
  const canManageWallet = useHasPermission(Permission.MANAGE_WALLET);
  const canManageLoyalty = useHasPermission(Permission.MANAGE_LOYALTY);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [walletTarget, setWalletTarget] = useState<any>(null);
  const [loyaltyTarget, setLoyaltyTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch customers on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteCustomer(deleteTarget._id || deleteTarget.id);
      toast.success('Customer deleted successfully');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  const customerList: any[] = Array.isArray(customers) ? customers : [];

  // Define columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <div className="text-sm">{row.original.phone || '—'}</div>,
    },
    {
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <CustomerActiveBadge isActive={row.original.isActive} />,
    },
    {
      id: 'loyaltyTier',
      header: 'Loyalty Tier',
      cell: ({ row }) => {
        const customerDoc = row.original.customerId;
        const tier = customerDoc?.loyaltyTierId;
        return (
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{tier?.name || 'None'}</span>
          </div>
        );
      },
    },
    {
      id: 'loyaltyPoints',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Points" />,
      cell: ({ row }) => {
        const points = row.original.customerId?.loyaltyPointsBalance ?? 0;
        return <div className="font-medium">{points.toLocaleString()}</div>;
      },
    },
    {
      id: 'customerStatus',
      header: 'Account Status',
      cell: ({ row }) => {
        const status = row.original.customerId?.status;
        if (!status) return <span className="text-sm text-muted-foreground">—</span>;
        return <CustomerAccountStatusBadge status={status} />;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
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
        const customer = row.original;

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
              <DropdownMenuItem onClick={() => setViewTarget(customer)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditTarget(customer)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </DropdownMenuItem>
              )}
              {canManageWallet && (
                <DropdownMenuItem onClick={() => setWalletTarget(customer)}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Manage Wallet
                </DropdownMenuItem>
              )}
              {canManageLoyalty && (
                <DropdownMenuItem onClick={() => setLoyaltyTarget(customer)}>
                  <Award className="mr-2 h-4 w-4" />
                  Adjust Loyalty
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(customer)}
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
  const stats = {
    total: customerList.length,
    active: customerList.filter((c) => c.isActive !== false).length,
    newThisMonth: customerList.filter((c) => {
      const created = new Date(c.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
    inactive: customerList.filter((c) => c.isActive === false).length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage customer accounts and profiles</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Modals */}
      <AddCustomerModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />

      <ViewCustomerModal
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        customer={viewTarget}
      />

      <EditCustomerModal
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        customer={editTarget}
      />

      <ManageWalletModal
        open={!!walletTarget}
        onOpenChange={(open) => !open && setWalletTarget(null)}
        customer={walletTarget}
      />

      <AdjustLoyaltyModal
        open={!!loyaltyTarget}
        onOpenChange={(open) => !open && setLoyaltyTarget(null)}
        customer={loyaltyTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Customer"
        description={
          <>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
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
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Users with role &quot;customer&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={customerList}
            searchKey="name"
            searchPlaceholder="Search by name, email, or phone..."
            isLoading={isLoading}
            onRowClick={(customer) => setViewTarget(customer)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
