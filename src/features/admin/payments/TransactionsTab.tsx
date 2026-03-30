// ============================================================================
// TRANSACTIONS TAB - Payment Transaction History
// ============================================================================

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, CheckCircle } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentStatusBadge } from '@/components/shared/StatusBadges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ============================================================================
// HELPERS
// ============================================================================

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  paystack: 'Paystack',
  wallet: 'Wallet',
  pos: 'POS',
  transfer: 'Bank Transfer',
};

function getCustomerName(payment: any): string {
  const order = payment.orderId;
  if (!order) return '—';
  return (
    order.customer?.name ||
    order.walkInCustomer?.name ||
    '—'
  );
}

// ============================================================================
// TRANSACTIONS TAB COMPONENT
// ============================================================================

export function TransactionsTab() {
  const { payments, isLoading, confirmPayment } = usePaymentStore();
  const canConfirmPayment = useHasPermission(Permission.CONFIRM_PAYMENT);
  const canProcessRefund = useHasPermission(Permission.PROCESS_REFUND);

  const handleConfirm = async (payment: any) => {
    try {
      await confirmPayment(payment._id || payment.id);
      toast.success('Payment confirmed successfully');
    } catch {
      toast.error('Failed to confirm payment');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      id: 'orderNumber',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order #" />,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.orderId?.orderNumber || '—'}
        </div>
      ),
    },
    {
      id: 'customer',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="text-sm">{getCustomerName(row.original)}</div>
      ),
    },
    {
      accessorKey: 'method',
      header: 'Payment Method',
      cell: ({ row }) => {
        const method = row.original.method || '';
        const label = METHOD_LABELS[method.toLowerCase()] || method || 'Unknown';
        return <Badge variant="outline">{label}</Badge>;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => (
        <div className="font-medium">₦{(row.original.amount || 0).toLocaleString()}</div>
      ),
    },
    {
      accessorKey: 'state',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <PaymentStatusBadge status={row.original.state || 'pending'} />,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : '—'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const payment = row.original;
        const state = (payment.state || '').toLowerCase();

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
              {canConfirmPayment && state === 'pending' && (
                <>
                  <DropdownMenuItem onClick={() => handleConfirm(payment)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canProcessRefund && state === 'paid' && (
                <DropdownMenuItem className="text-destructive">
                  Refund Payment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={Array.isArray(payments) ? payments : []}
        searchKey="method"
        searchPlaceholder="Search by method..."
        isLoading={isLoading}
      />
    </div>
  );
}
