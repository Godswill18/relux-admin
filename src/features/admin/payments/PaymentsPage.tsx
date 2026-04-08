// ============================================================================
// PAYMENTS PAGE - Payment Management Interface
// ============================================================================

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { TransactionsTab } from './TransactionsTab';
import { PaymentSettingsTab } from './PaymentSettingsTab';
import { DollarSign, CreditCard, XCircle, Wifi, Search, TrendingUp, RefreshCw } from 'lucide-react';
import { usePaymentSocket } from '@/lib/hooks/usePaymentSocket';
import { format } from 'date-fns';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

// ============================================================================
// PAYSTACK TRANSACTIONS TAB (inline)
// ============================================================================

function PaystackTab() {
  const {
    paystackTransactions,
    paystackStats,
    isLoadingPaystack,
  } = usePaymentStore();

  const { fetchPaystackTransactions, prependPaystackTransaction } = usePaymentStore();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [typeFilter, setType]     = useState('all');
  const [retrying, setRetrying]   = useState<string | null>(null);

  const handleRetry = async (reference: string) => {
    setRetrying(reference);
    try {
      const res = await apiClient.post(`/payments/paystack/retry/${reference}`);
      if (res.data.success) {
        toast.success('Transaction processed — wallet credited');
        prependPaystackTransaction({ ...res.data.data.transaction, status: 'paid' });
        fetchPaystackTransactions();
      } else {
        toast.error(res.data.message || 'Still pending on Paystack');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const filtered = (paystackTransactions || []).filter((tx: any) => {
    const matchSearch =
      !search ||
      tx.reference?.toLowerCase().includes(search.toLowerCase()) ||
      tx.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchType   = typeFilter   === 'all' || tx.type   === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  function statusColor(status: string) {
    if (status === 'paid' || status === 'success') return 'bg-green-100 text-green-700';
    if (status === 'failed')  return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-muted text-muted-foreground';
  }

  function typeLabel(type: string) {
    if (type === 'wallet_topup') return 'Wallet Top-up';
    if (type === 'order')        return 'Order Payment';
    return type || '—';
  }

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatus}>
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
        <Select value={typeFilter} onValueChange={setType}>
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

      {/* Loading */}
      {isLoadingPaystack && (
        <div className="py-10 text-center text-muted-foreground text-sm">Loading transactions…</div>
      )}

      {/* Desktop table */}
      {!isLoadingPaystack && (
        <>
          <div className="hidden md:block rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx: any) => (
                    <tr key={tx._id || tx.reference} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                      <td className="px-4 py-3 text-muted-foreground">{typeLabel(tx.type)}</td>
                      <td className="px-4 py-3 font-medium">₦{(tx.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(tx.status === 'pending' || (tx.status === 'paid' && !tx.webhookProcessed)) && (
                          <button
                            onClick={() => handleRetry(tx.reference)}
                            disabled={retrying === tx.reference}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Force-process this transaction"
                          >
                            <RefreshCw className={`h-3 w-3 ${retrying === tx.reference ? 'animate-spin' : ''}`} />
                            {retrying === tx.reference ? 'Retrying…' : 'Retry'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No transactions found</div>
            ) : (
              filtered.map((tx: any) => (
                <div key={tx._id || tx.reference} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground truncate">{tx.reference}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${statusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{typeLabel(tx.type)}</span>
                    <span className="font-semibold">₦{(tx.amount || 0).toLocaleString()}</span>
                  </div>
                  {tx.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                  )}
                  {(tx.status === 'pending' || (tx.status === 'paid' && !tx.webhookProcessed)) && (
                    <button
                      onClick={() => handleRetry(tx.reference)}
                      disabled={retrying === tx.reference}
                      className="flex items-center gap-1 text-xs text-blue-600 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${retrying === tx.reference ? 'animate-spin' : ''}`} />
                      {retrying === tx.reference ? 'Retrying…' : 'Retry transaction'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
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
            <p className="text-xs text-muted-foreground">{paystackTransactions?.length || 0} transactions</p>
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
