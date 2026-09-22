// ============================================================================
// CUSTOMERS PAGE - Customer Management Interface
// ============================================================================

import { useEffect, useRef, useState, useMemo } from 'react';
import apiClient from '@/lib/api/client';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus, MoreHorizontal, Eye, Edit, UserX, UserCheck, Wallet, Award,
  Search, Phone, Users, ArrowUpDown,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { CustomerActiveBadge, PortalStatusBadge } from '@/components/shared/StatusBadges';
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
  const { customers, isLoading, isFetchingMore, hasMore, fetchCustomers, loadMoreCustomers, deactivateCustomer, reactivateCustomer, setFilters, filters } = useCustomerStore();
  const canCreate = useHasPermission(Permission.CREATE_CUSTOMER);
  const canEdit = useHasPermission(Permission.EDIT_CUSTOMER);
  // Same permission that gated Delete, so replacing the action does not widen
  // who can cut a customer off. The backend enforces it independently.
  const canChangeStatus = useHasPermission(Permission.DELETE_CUSTOMER);
  const canManageWallet = useHasPermission(Permission.MANAGE_WALLET);
  const canManageLoyalty = useHasPermission(Permission.MANAGE_LOYALTY);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [walletTarget, setWalletTarget] = useState<any>(null);
  const [loyaltyTarget, setLoyaltyTarget] = useState<any>(null);
  // Account-status change awaiting confirmation. Nothing is sent on the first
  // click — the dialog must be confirmed.
  const [statusTarget, setStatusTarget] = useState<{ customer: any; action: 'deactivate' | 'reactivate' } | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  // Wire search input to store filter with debounce so backend is queried
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters({ search: search || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [search, setFilters]);

  // Reset store search filter on unmount to avoid polluting shared state
  useEffect(() => {
    return () => { setFilters({ search: undefined, status: 'all', portal: 'all' }); };
  }, [setFilters]);

  interface CustomerStats {
    total: number; active: number; newThisMonth: number; inactive: number;
    portalActive?: number; unregistered?: number; pendingVerification?: number;
    activationRate?: number;
  }
  const [serverStats, setServerStats] = useState<CustomerStats | null>(null);
  const hasFetchedStats = useRef(false);

  useEffect(() => {
    fetchCustomers();
    if (!hasFetchedStats.current) {
      hasFetchedStats.current = true;
      apiClient.get('/users/customer-stats')
        .then((res) => setServerStats(res.data?.data ?? null))
        .catch(() => {});
    }
  }, [fetchCustomers]);

  const openStatusChange = (customer: any) => {
    setDeactivationReason('');
    setStatusTarget({ customer, action: customer.isActive === false ? 'reactivate' : 'deactivate' });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    const { customer, action } = statusTarget;
    // Status changes act on the portal account. Rows now include customers
    // without one (walk-ins), so the account id is explicit rather than _id.
    const id = customer.userId;
    if (!id) return;
    try {
      setIsChangingStatus(true);
      if (action === 'deactivate') {
        await deactivateCustomer(id, deactivationReason.trim() || undefined);
        toast.success(`${customer.name}'s account has been deactivated`);
      } else {
        await reactivateCustomer(id);
        toast.success(`${customer.name}'s account has been reactivated`);
      }
      setStatusTarget(null);
    } catch (err: any) {
      // Server messages here are written for admins ("already deactivated",
      // "not found") and carry no internals, so they are shown as-is.
      toast.error(err?.response?.data?.message || `Could not ${action} this account. Please try again.`);
    } finally {
      setIsChangingStatus(false);
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

  // Stats — use server aggregates (accurate) with client fallback while loading
  const now = new Date();
  const stats = {
    total:        serverStats?.total        ?? customerList.length,
    active:       serverStats?.active       ?? customerList.filter((c) => c.isActive !== false).length,
    newThisMonth: serverStats?.newThisMonth ?? customerList.filter((c) => { const d = new Date(c.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    inactive:     serverStats?.inactive     ?? customerList.filter((c) => c.isActive === false).length,
    portalActive: serverStats?.portalActive ?? customerList.filter((c) => c.portalStatus === 'ACTIVE').length,
    unregistered: serverStats?.unregistered ?? customerList.filter((c) => c.portalStatus === 'UNREGISTERED').length,
    activationRate: serverStats?.activationRate ?? null,
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
      // Online access, separate from being a customer. A walk-in who has never
      // registered is a valid customer shown as "Not Activated".
      id: 'portalStatus',
      header: 'Portal Account',
      cell: ({ row }) => <PortalStatusBadge status={row.original.portalStatus} />,
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
              {canChangeStatus && customer.hasPortalAccount && (
                <>
                  <DropdownMenuSeparator />
                  {customer.isActive === false ? (
                    <DropdownMenuItem onClick={() => openStatusChange(customer)}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Reactivate Customer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => openStatusChange(customer)}
                      className="text-destructive"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate Customer
                    </DropdownMenuItem>
                  )}
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
        open={!!statusTarget}
        onOpenChange={(open) => !open && !isChangingStatus && setStatusTarget(null)}
        title={statusTarget?.action === 'reactivate' ? 'Reactivate Customer Account?' : 'Deactivate Customer Account?'}
        description={
          statusTarget?.action === 'reactivate' ? (
            <p>
              <strong>{statusTarget?.customer?.name}</strong> will be able to sign in and use
              their existing account again, with all of their history, wallet balance and
              points exactly as they were.
            </p>
          ) : (
            <div className="space-y-4">
              <p>
                This will prevent <strong>{statusTarget?.customer?.name}</strong> from accessing
                their account, and will sign them out of any open session. Their previous orders,
                payments, transactions, invoices, wallet balance, loyalty points and account
                history will remain available. You can reactivate the account at any time.
              </p>
              <div className="space-y-1.5 text-left">
                <Label htmlFor="deactivation-reason" className="text-foreground">
                  Reason for deactivation <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="deactivation-reason"
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="e.g. Requested by customer"
                />
              </div>
            </div>
          )
        }
        confirmLabel={statusTarget?.action === 'reactivate' ? 'Reactivate Account' : 'Deactivate Account'}
        destructive={statusTarget?.action !== 'reactivate'}
        isLoading={isChangingStatus}
        onConfirm={handleConfirmStatusChange}
      />

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      {/* Unique customer records — walk-in customers included, not portal logins. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.newThisMonth} new this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Portal Active</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{stats.portalActive}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.activationRate != null ? `${stats.activationRate}% activation rate` : 'Using the customer app'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Not Activated</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{stats.unregistered}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Customers without an online account</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs sm:text-sm font-medium">Deactivated</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold tabular-nums">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Access removed by an admin</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search (shared between mobile + desktop) ─────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Filtering happens server-side, so pagination stays correct.
            "Deactivated" is the business's decision (customer status); the
            others describe portal access. */}
        <Select
          value={
            filters?.status === 'deactivated' ? 'deactivated'
              : (filters?.portal && filters.portal !== 'all') ? `portal:${filters.portal}`
              : 'all'
          }
          onValueChange={(v) => {
            if (v === 'deactivated') setFilters({ status: 'deactivated', portal: 'all' });
            else if (v.startsWith('portal:')) setFilters({ status: 'all', portal: v.slice(7) as any });
            else setFilters({ status: 'all', portal: 'all' });
          }}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter customers">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="portal:active">Portal Active</SelectItem>
            <SelectItem value="portal:unregistered">Not Registered</SelectItem>
            <SelectItem value="portal:pending">Pending Verification</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
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
              canChangeStatus={canChangeStatus}
              canManageWallet={canManageWallet}
              canManageLoyalty={canManageLoyalty}
              onView={() => setViewTarget(customer)}
              onEdit={() => setEditTarget(customer)}
              onWallet={() => setWalletTarget(customer)}
              onLoyalty={() => setLoyaltyTarget(customer)}
              onStatusChange={() => openStatusChange(customer)}
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
  canChangeStatus: boolean;
  canManageWallet: boolean;
  canManageLoyalty: boolean;
  onView: () => void;
  onEdit: () => void;
  onWallet: () => void;
  onLoyalty: () => void;
  onStatusChange: () => void;
}

function MobileCustomerCard({
  customer,
  canEdit,
  canChangeStatus,
  canManageWallet,
  canManageLoyalty,
  onView,
  onEdit,
  onWallet,
  onLoyalty,
  onStatusChange,
}: MobileCustomerCardProps) {
  const tier = customer.customerId?.loyaltyTierId;
  const points = customer.customerId?.loyaltyPointsBalance ?? 0;
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
              {canChangeStatus && customer.hasPortalAccount && (
                <>
                  <DropdownMenuSeparator />
                  {customer.isActive === false ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(); }}>
                      <UserCheck className="mr-2 h-4 w-4" />Reactivate Customer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(); }}
                    >
                      <UserX className="mr-2 h-4 w-4" />Deactivate Customer
                    </DropdownMenuItem>
                  )}
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
            <PortalStatusBadge status={customer.portalStatus} />
          </div>
          <span className="text-xs text-muted-foreground">{joinedAt}</span>
        </div>
      </CardContent>
    </Card>
  );
}
