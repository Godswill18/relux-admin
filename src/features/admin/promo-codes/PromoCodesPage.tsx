// ============================================================================
// PROMO CODES PAGE - Promotional Code Management
// ============================================================================

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { AddPromoModal } from './AddPromoModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePromoStore, PromoCode } from '@/stores/usePromoStore';
import { toast } from 'sonner';
import {
  Tag,
  TrendingUp,
  DollarSign,
  Plus,
  MoreHorizontal,
  Trash,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function isPromoExpired(promo: PromoCode): boolean {
  if (!promo.expiresAt) return false;
  return new Date(promo.expiresAt) < new Date();
}

function isPromoEffectivelyActive(promo: PromoCode): boolean {
  return promo.active && !isPromoExpired(promo);
}

function PromoStatusBadge({ promo }: { promo: PromoCode }) {
  const expired = isPromoExpired(promo);
  if (expired) return <Badge variant="destructive">Expired</Badge>;
  return (
    <Badge variant={promo.active ? 'default' : 'secondary'}>
      {promo.active ? 'Active' : 'Inactive'}
    </Badge>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function PromoCodesPage() {
  const {
    promoCodes,
    isLoading,
    fetchPromoCodes,
    updatePromoCode,
    deletePromoCode,
  } = usePromoStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  // Computed stats — treat expired promos as inactive
  const activeCodes = promoCodes.filter((p) => isPromoEffectivelyActive(p)).length;
  const totalCodes = promoCodes.length;

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deletePromoCode(deleteTarget._id || deleteTarget.id);
      toast.success('Promo code deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete promo code');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (promo: PromoCode) => {
    if (isPromoExpired(promo) && !promo.active) {
      toast.error('Cannot activate an expired promo code');
      return;
    }
    try {
      await updatePromoCode(promo._id || promo.id, { active: !promo.active });
      toast.success(promo.active ? 'Promo code deactivated' : 'Promo code activated');
    } catch {
      toast.error('Failed to update promo code');
    }
  };

  const columns: ColumnDef<PromoCode>[] = [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.type === 'percent' ? 'Percentage' : 'Fixed'}
        </Badge>
      ),
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.type === 'percent'
            ? `${row.original.value}%`
            : `₦${(row.original.value ?? 0).toLocaleString()}`}
        </span>
      ),
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const used  = row.original.usageCount ?? 0;
        const limit = row.original.usageLimit;
        const pct   = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const atLimit = limit != null && used >= limit;
        return (
          <div className="space-y-1 min-w-[80px]">
            <span className={`text-sm font-medium ${atLimit ? 'text-destructive' : ''}`}>
              {used}{limit != null ? ` / ${limit}` : ''}
            </span>
            {limit != null && (
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${atLimit ? 'bg-destructive' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'usagePerUser',
      header: 'Per Customer',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.usagePerUser ?? 1}×</span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => {
        if (!row.original.expiresAt) return <span className="text-muted-foreground">Never</span>;
        const date = new Date(row.original.expiresAt);
        const isExpired = date < new Date();
        return (
          <span className={isExpired ? 'text-destructive' : ''}>
            {date.toLocaleDateString()}
            {isExpired && ' (Expired)'}
          </span>
        );
      },
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => <PromoStatusBadge promo={row.original} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const promo = row.original;
        const expired = isPromoExpired(promo);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              {expired ? (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  <ToggleLeft className="mr-2 h-4 w-4" />
                  Expired
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleToggleActive(promo)}>
                  {promo.active ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(promo)}
                className="text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Promo Codes</h1>
        <p className="text-muted-foreground text-sm">Manage promotional codes and discounts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promo Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCodes}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Codes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes - activeCodes}</div>
            <p className="text-xs text-muted-foreground">Deactivated or expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle>Promo Codes</CardTitle>
            <CardDescription>Create and manage promotional discount codes</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Code
          </Button>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
              ))
            ) : promoCodes.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center gap-2 py-10">
                <Tag className="h-8 w-8 opacity-30 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No promo codes found</p>
              </CardContent></Card>
            ) : promoCodes.map((promo) => {
              const expired = isPromoExpired(promo);
              const expiresDate = promo.expiresAt ? new Date(promo.expiresAt) : null;
              return (
                <Card key={promo._id || promo.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm">{promo.code}</span>
                          <PromoStatusBadge promo={promo} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                          <Badge variant="outline" className="text-xs">
                            {promo.type === 'percent' ? 'Percentage' : 'Fixed'}
                          </Badge>
                          <span className="font-medium">
                            {promo.type === 'percent'
                              ? `${promo.value}%`
                              : `₦${(promo.value ?? 0).toLocaleString()}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>
                            Used: <strong className={promo.usageLimit != null && (promo.usageCount ?? 0) >= promo.usageLimit ? 'text-destructive' : 'text-foreground'}>
                              {promo.usageCount ?? 0}{promo.usageLimit != null ? ` / ${promo.usageLimit}` : ''}
                            </strong>
                          </span>
                          <span>Per customer: <strong className="text-foreground">{promo.usagePerUser ?? 1}×</strong></span>
                        </div>
                        {expiresDate ? (
                          <p className={`text-xs ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {expired ? 'Expired: ' : 'Expires: '}
                            {expiresDate.toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No expiry</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {expired ? (
                            <DropdownMenuItem disabled className="text-muted-foreground">
                              <ToggleLeft className="mr-2 h-4 w-4" />Expired
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleToggleActive(promo)}>
                              {promo.active ? (
                                <><ToggleLeft className="mr-2 h-4 w-4" />Deactivate</>
                              ) : (
                                <><ToggleRight className="mr-2 h-4 w-4" />Activate</>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTarget(promo)} className="text-destructive">
                            <Trash className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={promoCodes}
              searchKey="code"
              searchPlaceholder="Search promo codes..."
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <AddPromoModal open={isAddOpen} onOpenChange={setIsAddOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Promo Code"
        description={
          <>
            Are you sure you want to delete the promo code{' '}
            <strong>{deleteTarget?.code}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
