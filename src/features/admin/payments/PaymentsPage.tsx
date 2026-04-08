// ============================================================================
// PAYMENTS PAGE - Payment Management Interface
// ============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { TransactionsTab } from './TransactionsTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import {
  DollarSign, CreditCard, XCircle, Wifi, Search, TrendingUp,
  RefreshCw, ChevronLeft, ChevronRight, X, Receipt, User,
} from 'lucide-react';
import { usePaymentSocket } from '@/lib/hooks/usePaymentSocket';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

const PAGE_SIZE = 15;

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === 'paid' || status === 'success') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'failed')  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-muted text-muted-foreground';
}

function typeLabel(type: string) {
  if (type === 'wallet_topup')  return 'Wallet Top-up';
  if (type === 'order')         return 'Order Payment';
  if (type === 'subscription')  return 'Subscription';
  return type || '—';
}

function fmt(date: string | Date | undefined) {
  if (!date) return '—';
  try { return format(new Date(date), 'dd MMM yyyy, HH:mm'); }
  catch { return '—'; }
}

// ─── Transaction Detail Modal ────────────────────────────────────────────────

function TransactionDetailModal({
  tx,
  onClose,
  onRetry,
  retrying,
}: {
  tx: any;
  onClose: () => void;
  onRetry: (ref: string) => void;
  retrying: string | null;
}) {
  if (!tx) return null;

  const customer = tx.customerId as any;
  const canRetry = tx.status === 'pending' || (tx.status === 'paid' && !tx.webhookProcessed);

  return (
    <Dialog open={!!tx} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        {/* Amount hero */}
        <div className="flex flex-col items-center py-3 gap-2 border-b">
          <p className="text-3xl font-bold">₦{(tx.amount || 0).toLocaleString()}</p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(tx.status)}`}>
              {tx.status}
            </span>
            <span className="text-xs text-muted-foreground">{typeLabel(tx.type)}</span>
          </div>
        </div>

        {/* Detail rows */}
        <div className="space-y-3 text-sm pt-1">
          {/* Reference */}
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Reference</p>
            <p className="font-mono text-xs break-all bg-muted px-2 py-1 rounded">{tx.reference}</p>
          </div>

          {/* Customer */}
          {customer && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{customer.name || '—'}</p>
                {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Created</p>
              <p className="font-medium text-xs">{fmt(tx.createdAt)}</p>
            </div>
            {tx.paidAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Paid At</p>
                <p className="font-medium text-xs">{fmt(tx.paidAt)}</p>
              </div>
            )}
            {tx.orderId && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Order</p>
                <p className="font-medium text-xs">{(tx.orderId as any)?.orderNumber || '—'}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Webhook</p>
              <p className={`text-xs font-medium ${tx.webhookProcessed ? 'text-green-600' : 'text-yellow-600'}`}>
                {tx.webhookProcessed ? 'Processed' : 'Not processed'}
              </p>
            </div>
          </div>

          {tx.failureReason && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Failure Reason</p>
              <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                {tx.failureReason}
              </p>
            </div>
          )}

          {tx.paystackData?.gateway_response && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Gateway Response</p>
              <p className="text-xs text-muted-foreground">{tx.paystackData.gateway_response}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2 pt-3 border-t">
          {canRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(tx.reference)}
              disabled={retrying === tx.reference}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retrying === tx.reference ? 'animate-spin' : ''}`} />
              {retrying === tx.reference ? 'Retrying…' : 'Retry'}
            </Button>
          )}
          <Button size="sm" onClick={onClose} className="flex-1">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Paystack Tab ────────────────────────────────────────────────────────────

function PaystackTab() {
  const {
    paystackTransactions,
    paystackStats,
    paystackPagination,
    isLoadingPaystack,
    fetchPaystackTransactions,
    prependPaystackTransaction,
  } = usePaymentStore();

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatus]       = useState('all');
  const [typeFilter,   setType]         = useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [page,         setPage]         = useState(1);
  const [selectedTx,   setSelectedTx]   = useState<any>(null);
  const [retrying,     setRetrying]     = useState<string | null>(null);

  // Debounce search so we don't fire on every keystroke
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350);
  };

  const resetPage = () => setPage(1);

  const load = useCallback(() => {
    const params: Record<string, string> = {
      page:  String(page),
      limit: String(PAGE_SIZE),
    };
    if (statusFilter !== 'all') params.status   = statusFilter;
    if (typeFilter   !== 'all') params.type     = typeFilter;
    if (debouncedSearch)        params.search   = debouncedSearch;
    if (dateFrom)               params.dateFrom = dateFrom;
    if (dateTo)                 params.dateTo   = dateTo;
    fetchPaystackTransactions(params);
  }, [page, statusFilter, typeFilter, debouncedSearch, dateFrom, dateTo, fetchPaystackTransactions]);

  useEffect(() => { load(); }, [load]);

  const handleRetry = async (reference: string) => {
    setRetrying(reference);
    try {
      const res = await apiClient.post(`/payments/paystack/retry/${reference}`);
      if (res.data.success) {
        toast.success('Transaction processed — wallet credited');
        prependPaystackTransaction({ ...res.data.data.transaction, status: 'paid' });
        setSelectedTx(null);
        load();
      } else {
        toast.error(res.data.message || 'Still pending on Paystack');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const clearDates = () => { setDateFrom(''); setDateTo(''); resetPage(); };
  const hasDate = !!(dateFrom || dateTo);
  const totalPages = paystackPagination?.pages ?? 1;
  const totalCount = paystackPagination?.total ?? paystackTransactions.length;

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-lg font-bold text-green-600">₦{(paystackStats.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-bold text-yellow-600">{paystackStats.pendingCount || 0}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-lg font-bold text-red-600">{paystackStats.failedCount || 0}</p>
        </div>
      </div>

      {/* Filters row 1: search + status + type */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatus(v); resetPage(); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setType(v); resetPage(); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="wallet_topup">Wallet Top-up</SelectItem>
            <SelectItem value="order">Order Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters row 2: date range */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
          <Input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[130px]">
          <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
            className="h-8 text-sm"
          />
        </div>
        {hasDate && (
          <Button variant="ghost" size="sm" onClick={clearDates} className="h-8 px-2 shrink-0" title="Clear dates">
            <X className="w-4 h-4" />
          </Button>
        )}
        <div className="flex items-end ml-auto">
          <p className="text-xs text-muted-foreground tabular-nums">
            {totalCount} transaction{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoadingPaystack && (
        <div className="py-10 text-center text-muted-foreground text-sm">Loading transactions…</div>
      )}

      {!isLoadingPaystack && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paystackTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paystackTransactions.map((tx: any) => {
                    const customer = tx.customerId as any;
                    return (
                      <tr
                        key={tx._id || tx.reference}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedTx(tx)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                        <td className="px-4 py-3">
                          {customer ? (
                            <div>
                              <p className="font-medium text-xs">{customer.name || '—'}</p>
                              <p className="text-xs text-muted-foreground">{customer.phone || customer.email || ''}</p>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{typeLabel(tx.type)}</td>
                        <td className="px-4 py-3 font-medium">₦{(tx.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(tx.createdAt)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {(tx.status === 'pending' || (tx.status === 'paid' && !tx.webhookProcessed)) && (
                            <button
                              onClick={() => handleRetry(tx.reference)}
                              disabled={retrying === tx.reference}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            >
                              <RefreshCw className={`h-3 w-3 ${retrying === tx.reference ? 'animate-spin' : ''}`} />
                              {retrying === tx.reference ? 'Retrying…' : 'Retry'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {paystackTransactions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No transactions found</div>
            ) : (
              paystackTransactions.map((tx: any) => {
                const customer = tx.customerId as any;
                return (
                  <div
                    key={tx._id || tx.reference}
                    className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/30 active:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground truncate">{tx.reference}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    {customer?.name && (
                      <p className="text-xs font-medium">{customer.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{typeLabel(tx.type)}</span>
                      <span className="font-semibold text-sm">₦{(tx.amount || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{fmt(tx.createdAt)}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="h-8 gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <TransactionDetailModal
        tx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onRetry={handleRetry}
        retrying={retrying}
      />
    </div>
  );
}

// ============================================================================
// PAYMENTS PAGE COMPONENT
// ============================================================================

export default function PaymentsPage() {
  const {
    payments,
    fetchPayments,
    fetchSettings,
    fetchPaystackTransactions,
    paystackStats,
    paystackTransactions,
  } = usePaymentStore();
  const [activeTab, setActiveTab] = useState('transactions');

  usePaymentSocket();

  useEffect(() => {
    fetchPayments();
    fetchSettings();
    fetchPaystackTransactions();
  }, [fetchPayments, fetchSettings, fetchPaystackTransactions]);

  const paymentList: any[] = Array.isArray(payments) ? payments : [];

  const totalRevenue = paymentList
    .filter((p) => p.state === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCount  = paymentList.filter((p) => p.state === 'pending').length;
  const pendingAmount = paymentList
    .filter((p) => p.state === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const failedCount = paymentList.filter((p) => p.state === 'failed').length;
  const paystackPendingCount = paystackStats?.pendingCount || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Payment Management</h1>
        <p className="text-muted-foreground">Manage payments, transactions, and payment methods</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₦{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From confirmed payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₦{pendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{pendingCount} awaiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Transactions failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paystack Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              ₦{(paystackStats?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{paystackTransactions?.length || 0} loaded</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transactions" className="flex-1 sm:flex-none">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="paystack" className="flex-1 sm:flex-none gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Paystack
            {paystackPendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {paystackPendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>View and manage all payment transactions</CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <TransactionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paystack">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div>
                  <CardTitle>Paystack Transactions</CardTitle>
                  <CardDescription>Real-time Paystack payments — wallet top-ups and order payments</CardDescription>
                </div>
                <Wifi className="h-4 w-4 text-green-500 ml-auto shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <PaystackTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment methods and gateway settings</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
