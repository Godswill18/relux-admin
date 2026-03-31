// ============================================================================
// TRANSACTIONS TAB - Payment Transaction History
// ============================================================================

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, CheckCircle, Search, CreditCard } from 'lucide-react';
import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { LoadMoreTrigger } from '@/components/shared/LoadMoreTrigger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  lenco: 'Lenco',
};

const STATUS_LABELS: Record<string, string> = {
  all: 'All Statuses',
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  refunded: 'Refunded',
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
  const { payments, isLoading, confirmPayment, isFetchingMore, hasMore, loadMorePayments } = usePaymentStore();
  const canConfirmPayment = useHasPermission(Permission.CONFIRM_PAYMENT);
  const canProcessRefund = useHasPermission(Permission.PROCESS_REFUND);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const handleConfirm = async (payment: any) => {
    try {
      await confirmPayment(payment._id || payment.id);
      toast.success('Payment confirmed successfully');
    } catch {
      toast.error('Failed to confirm payment');
    }
  };

  const paymentList: any[] = Array.isArray(payments) ? payments : [];

  const filtered = useMemo(() => {
    return paymentList.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const method = (p.method || '').toLowerCase();
        const label = (METHOD_LABELS[method] || method).toLowerCase();
        const customer = getCustomerName(p).toLowerCase();
        const orderNum = (p.orderId?.orderNumber || '').toLowerCase();
        if (!label.includes(q) && !customer.includes(q) && !orderNum.includes(q)) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && (p.state || '').toLowerCase() !== statusFilter) return false;
      // Method filter
      if (methodFilter !== 'all' && (p.method || '').toLowerCase() !== methodFilter) return false;
      return true;
    });
  }, [paymentList, search, statusFilter, methodFilter]);

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
      header: 'Method',
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
      {/* Search + Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order, customer, or method…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Mobile cards ─────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
          ))
        ) : filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-2 py-10">
            <CreditCard className="h-8 w-8 opacity-30 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No transactions found</p>
          </CardContent></Card>
        ) : filtered.map((payment) => {
          const state = (payment.state || '').toLowerCase();
          const method = payment.method || '';
          const methodLabel = METHOD_LABELS[method.toLowerCase()] || method || 'Unknown';
          return (
            <Card key={payment._id || payment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {payment.orderId?.orderNumber || '—'}
                      </span>
                      <PaymentStatusBadge status={payment.state || 'pending'} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{getCustomerName(payment)}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{methodLabel}</Badge>
                      <span className="font-medium text-sm">₦{(payment.amount || 0).toLocaleString()}</span>
                    </div>
                    {payment.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy · HH:mm')}
                      </p>
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
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={filtered}
          searchKey={undefined}
          isLoading={isLoading}
        />
      </div>

      <LoadMoreTrigger
        onIntersect={loadMorePayments}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
      />
    </div>
  );
}
