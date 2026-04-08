// ============================================================================
// LOYALTY LEDGER TAB - Points Transaction History
// ============================================================================

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Minus, ArrowRightLeft, Wallet } from 'lucide-react';
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
      cell: ({ row }) => {
        const raw = row.original.customerId as unknown;
        const idStr =
          typeof raw === 'string'
            ? raw
            : (raw as { _id?: string; id?: string })?._id?.toString() ??
              (raw as { _id?: string; id?: string })?.id?.toString() ??
              String(raw ?? '');
        const name = (raw as { name?: string })?.name;
        return (
          <div className="font-medium">
            {name ? name : `Customer #${idStr.slice(0, 8)}`}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = String(row.original.type ?? '').toUpperCase();
        const typeConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
          EARN:     { label: 'Earned',    variant: 'default',     icon: <Plus className="h-3 w-3" /> },
          EARNED:   { label: 'Earned',    variant: 'default',     icon: <Plus className="h-3 w-3" /> },
          REDEEM:   { label: 'Redeemed',  variant: 'secondary',   icon: <Minus className="h-3 w-3" /> },
          REDEEMED: { label: 'Redeemed',  variant: 'secondary',   icon: <Minus className="h-3 w-3" /> },
          ADJUST:   { label: 'Adjusted',  variant: 'outline',     icon: <ArrowRightLeft className="h-3 w-3" /> },
          ADJUSTED: { label: 'Adjusted',  variant: 'outline',     icon: <ArrowRightLeft className="h-3 w-3" /> },
          CONVERT:  { label: 'Converted', variant: 'secondary',   icon: <Wallet className="h-3 w-3" /> },
          REVERSAL: { label: 'Reversal',  variant: 'destructive', icon: <Minus className="h-3 w-3" /> },
          EXPIRED:  { label: 'Expired',   variant: 'destructive', icon: <Minus className="h-3 w-3" /> },
        };
        const config = typeConfig[type] ?? { label: type || 'Unknown', variant: 'outline' as const, icon: null };
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
        const type = String(row.original.type ?? '').toUpperCase();
        const isPositive = ['EARN', 'EARNED'].includes(type) || (['ADJUST', 'ADJUSTED'].includes(type) && points > 0);
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
        searchKey="reason"
        searchPlaceholder="Search by reason..."
        isLoading={isLoading}
      />
    </div>
  );
}
