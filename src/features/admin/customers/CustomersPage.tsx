// ============================================================================
// CUSTOMERS PAGE - Customer Management Interface
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, MoreHorizontal, Eye, Edit, Trash, Wallet, Award,
  Search, Phone, Users, ArrowUpDown,
} from 'lucide-react';
import { AddCustomerModal } from './AddCustomerModal';
import { ViewCustomerModal } from './ViewCustomerModal';
import { EditCustomerModal } from './EditCustomerModal';
import { ManageWalletModal } from './ManageWalletModal';
import { AdjustLoyaltyModal } from './AdjustLoyaltyModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// CUSTOMERS PAGE COMPONENT
// ============================================================================

export default function CustomersPage() {
  const { customers, isLoading, isFetchingMore, hasMore, fetchCustomers, loadMoreCustomers, deleteCustomer } = useCustomerStore();
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
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

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

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customerList;
    return customerList.filter((c) => {
      const name = (c.name ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      const phone = (c.phone ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customerList, search]);

  // Sorted list — only consumed by the mobile card view; desktop table sorts via column headers
  const sortedMobileCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    switch (sortBy) {
      case 'name_asc':
        return list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      case 'name_desc':
        return list.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
      case 'joined_newest':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'joined_oldest':
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'points_high':
        return list.sort((a, b) => (b.customerId?.loyaltyPointsBalance ?? 0) - (a.customerId?.loyaltyPointsBalance ?? 0));
      case 'points_low':
        return list.sort((a, b) => (a.customerId?.loyaltyPointsBalance ?? 0) - (b.customerId?.loyaltyPointsBalance ?? 0));
      case 'active_first':
        return list.sort((a, b) => (a.isActive === false ? 1 : 0) - (b.isActive === false ? 1 : 0));
      default:
        return list;
    }
  }, [filteredCustomers, sortBy]);

  // Stats
  const now = new Date();
  const stats = {
    total: customerList.length,
    active: customerList.filter((c) => c.isActive !== false).length,
    newThisMonth: customerList.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    inactive: customerList.filter((c) => c.isActive === false).length,
  };

  // Desktop table columns
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
        const tier = row.original.customerId?.loyaltyTierId;
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage customer accounts and profiles</p>
        </div>
        {canCreate && (
          <Button size="sm" className="shrink-0" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
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

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">New This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.newThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search (shared between mobile + desktop) ─────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Mobile Sort (hidden on md+) ─────────────────────────────────────── */}
      <div className="md:hidden">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full">
            <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Name: A → Z</SelectItem>
            <SelectItem value="name_desc">Name: Z → A</SelectItem>
            <SelectItem value="joined_newest">Joined: Newest first</SelectItem>
            <SelectItem value="joined_oldest">Joined: Oldest first</SelectItem>
            <SelectItem value="points_high">Points: High → Low</SelectItem>
            <SelectItem value="points_low">Points: Low → High</SelectItem>
            <SelectItem value="active_first">Active customers first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Mobile Card List (hidden on md+) ────────────────────────────────── */}
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
        ) : sortedMobileCustomers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Users className="h-10 w-10 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No customers found</p>
            </CardContent>
          </Card>
        ) : (
          sortedMobileCustomers.map((customer) => (
            <MobileCustomerCard
              key={customer._id}
              customer={customer}
              canEdit={canEdit}
              canDelete={canDelete}
              canManageWallet={canManageWallet}
              canManageLoyalty={canManageLoyalty}
              onView={() => setViewTarget(customer)}
              onEdit={() => setEditTarget(customer)}
              onWallet={() => setWalletTarget(customer)}
              onLoyalty={() => setLoyaltyTarget(customer)}
              onDelete={() => setDeleteTarget(customer)}
            />
          ))
        )}
        <LoadMoreTrigger
          onIntersect={loadMoreCustomers}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
        />
      </div>

      {/* ── Desktop Table (hidden on mobile) ────────────────────────────────── */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Users with role &quot;customer&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredCustomers}
            searchKey={undefined}
            searchPlaceholder="Search by name, email, or phone..."
            isLoading={isLoading}
            onRowClick={(customer) => setViewTarget(customer)}
            showColumnVisibility
          />
        </CardContent>
      </Card>
      <LoadMoreTrigger
        onIntersect={loadMoreCustomers}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
      />
    </div>
  );
}

// ============================================================================
// MOBILE CUSTOMER CARD
// ============================================================================

interface MobileCustomerCardProps {
  customer: any;
  canEdit: boolean;
  canDelete: boolean;
  canManageWallet: boolean;
  canManageLoyalty: boolean;
  onView: () => void;
  onEdit: () => void;
  onWallet: () => void;
  onLoyalty: () => void;
  onDelete: () => void;
}

function MobileCustomerCard({
  customer,
  canEdit,
  canDelete,
  canManageWallet,
  canManageLoyalty,
  onView,
  onEdit,
  onWallet,
  onLoyalty,
  onDelete,
}: MobileCustomerCardProps) {
  const tier = customer.customerId?.loyaltyTierId;
  const points = customer.customerId?.loyaltyPointsBalance ?? 0;
  const accountStatus = customer.customerId?.status;
  const joinedAt = customer.createdAt
    ? format(new Date(customer.createdAt), 'MMM dd, yyyy')
    : '—';

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onView}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: name/email + actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{customer.name}</div>
            {customer.email && (
              <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
            )}
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
                <Eye className="mr-2 h-4 w-4" />View Details
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Edit className="mr-2 h-4 w-4" />Edit Customer
                </DropdownMenuItem>
              )}
              {canManageWallet && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onWallet(); }}>
                  <Wallet className="mr-2 h-4 w-4" />Manage Wallet
                </DropdownMenuItem>
              )}
              {canManageLoyalty && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLoyalty(); }}>
                  <Award className="mr-2 h-4 w-4" />Adjust Loyalty
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  >
                    <Trash className="mr-2 h-4 w-4" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Phone */}
        {customer.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{customer.phone}</span>
          </div>
        )}

        {/* Loyalty tier + points */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{tier?.name || 'No tier'}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="font-medium text-foreground">{points.toLocaleString()} pts</span>
        </div>

        {/* Bottom row: status badges + joined date */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CustomerActiveBadge isActive={customer.isActive} />
            {accountStatus && <CustomerAccountStatusBadge status={accountStatus} />}
          </div>
          <span className="text-xs text-muted-foreground">{joinedAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}
