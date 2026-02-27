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
      accessorKey: 'usageLimit',
      header: 'Usage Limit',
      cell: ({ row }) => (
        <span>{row.original.usageLimit ?? '∞'}</span>
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
      cell: ({ row }) => {
        const promo = row.original;
        const expired = isPromoExpired(promo);
        if (expired) {
          return <Badge variant="destructive">Expired</Badge>;
        }
        return (
          <Badge variant={promo.active ? 'default' : 'secondary'}>
            {promo.active ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promo Codes</h1>
        <p className="text-muted-foreground">Manage promotional codes and discounts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Promo Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCodes}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Codes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes - activeCodes}</div>
            <p className="text-xs text-muted-foreground">Deactivated or expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Promo Codes</CardTitle>
            <CardDescription>Create and manage promotional discount codes</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Code
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={promoCodes}
            searchKey="code"
            searchPlaceholder="Search promo codes..."
            isLoading={isLoading}
          />
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
