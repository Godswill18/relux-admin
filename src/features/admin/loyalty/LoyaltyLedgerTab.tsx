// ============================================================================
// LOYALTY LEDGER TAB - Points Transaction History
// ============================================================================

import { ColumnDef } from '@tanstack/react-table';
import { Plus, Minus, ArrowRightLeft } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { LoyaltyTransaction } from '@/types';
import { format } from 'date-fns';

// ============================================================================
// LOYALTY LEDGER TAB COMPONENT
// ============================================================================

export function LoyaltyLedgerTab() {
  const { transactions, isLoading } = useLoyaltyStore();

  // Define columns
  const columns: ColumnDef<LoyaltyTransaction>[] = [
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.original.createdAt), 'MMM dd, yyyy HH:mm')}
        </div>
      ),
    },
    {
      accessorKey: 'customerId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="font-medium">Customer #{row.original.customerId.slice(0, 8)}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.type;
        const typeConfig = {
          EARNED: { label: 'Earned', variant: 'default' as const, icon: <Plus className="h-3 w-3" /> },
          REDEEMED: { label: 'Redeemed', variant: 'secondary' as const, icon: <Minus className="h-3 w-3" /> },
          ADJUSTED: { label: 'Adjusted', variant: 'outline' as const, icon: <ArrowRightLeft className="h-3 w-3" /> },
          EXPIRED: { label: 'Expired', variant: 'destructive' as const, icon: <Minus className="h-3 w-3" /> },
        };
        const config = typeConfig[type];
        return (
          <Badge variant={config.variant}>
            <span className="flex items-center gap-1">
              {config.icon}
              {config.label}
            </span>
          </Badge>
        );
      },
    },
    {
      accessorKey: 'points',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Points" />,
      cell: ({ row }) => {
        const points = row.original.points;
        const type = row.original.type;
        const isPositive = type === 'EARNED' || (type === 'ADJUSTED' && points > 0);
        return (
          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{points.toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-md truncate">
          {row.original.reason}
        </div>
      ),
    },
    {
      accessorKey: 'balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance After" />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.balance?.toLocaleString() || '-'}</div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={transactions}
        searchKey="customerId"
        searchPlaceholder="Search by customer ID..."
        isLoading={isLoading}
      />
    </div>
  );
}
