// ============================================================================
// TRANSACTIONS TAB - Payment Transaction History
// ============================================================================

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, CheckCircle, XCircle, DollarSign } from 'lucide-react';
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
import { useOrderStore } from '@/stores/useOrderStore';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { Order, Permission } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';


// ============================================================================
// TRANSACTIONS TAB COMPONENT
// ============================================================================

export function TransactionsTab() {
  const { orders, isLoading } = useOrderStore();
  const { confirmPayment } = usePaymentStore();
  const canConfirmPayment = useHasPermission(Permission.CONFIRM_PAYMENT);
  const canProcessRefund = useHasPermission(Permission.PROCESS_REFUND);

  // Handle confirm payment
  const handleConfirm = async (order: any) => {
    try {
      await confirmPayment(order._id || order.id);
      toast.success('Payment confirmed successfully');
    } catch (error) {
      toast.error('Failed to confirm payment');
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
      cell: ({ row }) => row.original.customer?.name || '—',
    },
    {
      id: 'paymentMethod',
      header: 'Payment Method',
      cell: ({ row }) => {
        const method = row.original.payment?.method || row.original.paymentMethod || '';
        const methodLabels: Record<string, string> = {
          cash: 'Cash',
          card: 'Card',
          bank_transfer: 'Bank Transfer',
          bank: 'Bank Transfer',
          wallet: 'Wallet',
          pos: 'POS',
        };
        const label = methodLabels[method?.toLowerCase?.()] || method || 'Unknown';
        return <Badge variant="outline">{label}</Badge>;
      },
    },
    {
      id: 'total',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const total = row.original.pricing?.total || row.original.total || 0;
        return <div className="font-medium">₦{total.toLocaleString()}</div>;
      },
    },
    {
      id: 'paymentStatus',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const paymentStatus = row.original.payment?.status || row.original.paymentStatus || 'unpaid';
        return <PaymentStatusBadge status={paymentStatus} />;
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <div className="text-sm">
            {date ? format(new Date(date), 'MMM dd, yyyy HH:mm') : '—'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const order = row.original;
        const paymentStatus = (order.payment?.status || order.paymentStatus || '').toLowerCase();

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
              {canConfirmPayment && (paymentStatus === 'pending' || paymentStatus === 'unpaid') && (
                <>
                  <DropdownMenuItem onClick={() => handleConfirm(order)}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {canProcessRefund && paymentStatus === 'paid' && (
                <>
                  <DropdownMenuItem className="text-destructive">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Refund Payment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>View Order Details</DropdownMenuItem>
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
        data={Array.isArray(orders) ? orders : []}
        searchKey="orderNumber"
        searchPlaceholder="Search by order number or customer name..."
        isLoading={isLoading}
      />
    </div>
  );
}
