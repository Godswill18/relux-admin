// ============================================================================
// FINANCIAL REPORTS — developer (Superadmin) only. Read-only: every figure is
// computed by the backend report service; this page only displays it.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const NGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });
const money = (n: number) => NGN.format(n || 0);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: '2-digit', month: 'short', year: 'numeric' }) : '—');

interface Summary {
  period: { year: number; month: number };
  revenue: {
    definition: string; total: number; orders: number; averageOrder: number;
    daily: { date: string; revenue: number; orders: number }[];
    methods: { method: string; revenue: number; orders: number }[];
    serviceLevels: { level: string; revenue: number; orders: number }[];
    integrity: { ledgerMismatchOrders: number; ledgerMismatchAmount: number; estimatedDateOrders: number };
  };
  financial: {
    grossCollected: number; refunds: number; netCollected: number; paymentTransactions: number; paidOrders: number;
    methods: { method: string; collected: number; refunds: number; net: number; transactions: number }[];
    serviceLevels: { level: string; collected: number; refunds: number; net: number }[];
    daily: { date: string; collected: number; refunds: number; net: number }[];
  };
  orders: {
    ordersCreated: number; orderValue: number; discounts: number; amountPaid: number; outstandingBalance: number;
    paid: number; partial: number; unpaid: number; refunded: number; cancelled: number; outstandingOrders: number;
    daily: { date: string; orders: number; value: number; paid: number; outstanding: number }[];
    serviceLevels: { level: string; orders: number; value: number; paid: number; outstanding: number }[];
  };
  outstanding: { orders: number; outstandingBalance: number; partial: number };
  unrecordedRefunds: { orders: number; amount: number };
  reconciliation: { ok: boolean; revenue: { ok: boolean }; payments: { ok: boolean } };
}
interface RevenueRow {
  orderId: string; orderNumber: string; customer: { name: string; phone: string }; orderDate: string;
  orderStatus: string; paidAt: string | null; revenueAt: string; amount: number; method: string;
  serviceLevel: string; ledgerMismatch: boolean;
}
interface OutRow {
  orderId: string; orderNumber: string; customer: { name: string; phone: string }; orderDate: string; total: number;
  amountPaid: number; outstanding: number; paymentState: string; orderStatus: string; ageDays: number;
}
interface Paged<T> { rows: T[]; page: number; pages: number; total: number; totals: Record<string, number> }

const STATE_STYLE: Record<string, string> = {
  paid: 'bg-green-500/15 text-green-600 dark:text-green-400',
  partial: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  unpaid: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  refunded: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  cancelled: 'bg-red-500/15 text-red-600 dark:text-red-400',
};
const StateBadge = ({ state }: { state: string }) => (
  <Badge variant="outline" className={`border-0 capitalize ${STATE_STYLE[state] || ''}`}>{state === 'partial' ? 'Partially paid' : state}</Badge>
);

function Stat({ label, value, sub, tone, loading }: { label: string; value: string; sub?: string; tone?: string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {loading ? <Skeleton className="mt-2 h-8 w-32" /> : <p className={`mt-1 text-2xl font-semibold ${tone || ''}`}>{value}</p>}
        {sub && !loading && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function errMsg(e: unknown) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to load financial report.';
}

function PagerFooter({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-muted-foreground">Page {page} of {pages}</span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  );
}

export default function FinancialReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<{ month: string; revenue: number; net: number }[]>([]);
  const [paid, setPaid] = useState<Paged<RevenueRow> | null>(null);
  const [out, setOut] = useState<Paged<OutRow> | null>(null);
  const [paidPage, setPaidPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const [paidSearch, setPaidSearch] = useState('');
  const [outSearch, setOutSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = `year=${year}&month=${month}`;

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, t] = await Promise.all([
        apiClient.get(`/reports/financial/summary?${q}`),
        apiClient.get(`/reports/financial/revenue-trend?${q}`),
      ]);
      setSummary(s.data.data); setTrend(t.data.data.months);
    } catch (e) { setError(errMsg(e)); setSummary(null); } finally { setLoading(false); }
  }, [q]);

  const loadPaid = useCallback(async () => {
    try {
      const r = await apiClient.get(`/reports/financial/revenue-orders?${q}&page=${paidPage}&limit=15&search=${encodeURIComponent(paidSearch)}`);
      setPaid(r.data.data);
    } catch (e) { setError(errMsg(e)); }
  }, [q, paidPage, paidSearch]);

  const loadOut = useCallback(async () => {
    try {
      const r = await apiClient.get(`/reports/financial/outstanding-orders?page=${outPage}&limit=15&search=${encodeURIComponent(outSearch)}`);
      setOut(r.data.data);
    } catch (e) { setError(errMsg(e)); }
  }, [outPage, outSearch]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadPaid(); }, [loadPaid]);
  useEffect(() => { loadOut(); }, [loadOut]);
  useEffect(() => { setPaidPage(1); }, [year, month, paidSearch]);
  useEffect(() => { setOutPage(1); }, [outSearch]);

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth() + 1);
  };

  const exportFile = async (format: 'xlsx' | 'csv') => {
    try {
      const r = await apiClient.get(`/reports/financial/export?${q}&format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = `financial-report-${year}-${String(month).padStart(2, '0')}.${format}`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(errMsg(e)); }
  };

  const daily = useMemo(() => (summary?.revenue.daily || []).map((d) => ({ day: Number(d.date.slice(8)), revenue: d.revenue })), [summary]);
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  if (error && !summary) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <Card><CardContent className="flex items-center justify-between p-6">
          <p>Unable to load financial report.</p>
          <Button onClick={() => { setError(null); loadAll(); loadPaid(); loadOut(); }}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const f = summary?.financial; const o = summary?.orders; const rv = summary?.revenue;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Figures come from verified payment records. Times use WAT (Africa/Lagos).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => exportFile('xlsx')}><Download className="mr-1 h-4 w-4" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportFile('csv')}><Download className="mr-1 h-4 w-4" />CSV</Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* REVENUE — paid orders, any status except cancelled */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Revenue — {MONTHS[month - 1]} {year}</h2>
          <p className="text-xs text-muted-foreground">
            Orders with payment status <strong>Paid</strong>, in any order status except <strong>Cancelled</strong>, at the order total, dated by payment date (WAT).
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat loading={loading} label="Monthly revenue" value={money(rv?.total ?? 0)} tone="text-green-600 dark:text-green-400" sub="paid orders, excluding cancelled" />
          <Stat loading={loading} label="Revenue orders" value={String(rv?.orders ?? 0)} />
          <Stat loading={loading} label="Average order" value={money(rv?.averageOrder ?? 0)} />
        </div>
        {summary && summary.revenue.integrity.ledgerMismatchOrders > 0 && (
          <p className="text-sm text-amber-600">
            {summary.revenue.integrity.ledgerMismatchOrders} revenue order(s) are marked Paid but the payment records show a different amount received
            ({money(summary.revenue.integrity.ledgerMismatchAmount)} difference). They are counted at the order total; please review them.
          </p>
        )}
        {summary && summary.revenue.integrity.estimatedDateOrders > 0 && (
          <p className="text-xs text-muted-foreground">
            {summary.revenue.integrity.estimatedDateOrders} paid order(s) have no recorded payment date; their order date was used.
          </p>
        )}
      </section>

      {/* PAYMENTS RECEIVED — cash view, by payment date */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Payments received</h2>
          <p className="text-xs text-muted-foreground">Ledger view — every payment transaction received in {MONTHS[month - 1]} {year}, including part-payments on orders not yet fully paid. For reconciliation only; not the revenue figure.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat loading={loading} label="Received" value={money(f?.grossCollected ?? 0)} sub={`${f?.paymentTransactions ?? 0} payments`} />
          <Stat loading={loading} label="Refunds" value={money(f?.refunds ?? 0)} tone="text-red-600 dark:text-red-400" />
          <Stat loading={loading} label="Net received" value={money(f?.netCollected ?? 0)} />
          <Stat loading={loading} label="Orders paid into" value={String(f?.paidOrders ?? 0)} />
        </div>
        {summary && !summary.reconciliation.ok && (
          <p className="text-sm text-amber-600">Reconciliation check failed — totals on this page do not agree. Do not rely on them.</p>
        )}
        {summary && summary.unrecordedRefunds.orders > 0 && (
          <p className="text-sm text-amber-600">
            {summary.unrecordedRefunds.orders} order(s) are marked refunded without a recorded refund transaction; they are not deducted above.
          </p>
        )}
      </section>

      {/* MONTHLY ORDERS — by order creation date */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Monthly orders</h2>
          <p className="text-xs text-muted-foreground">Orders created in {MONTHS[month - 1]} {year} — based on order creation date</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat loading={loading} label="Orders created" value={String(o?.ordersCreated ?? 0)} sub={`${o?.cancelled ?? 0} cancelled`} />
          <Stat loading={loading} label="Order value" value={money(o?.orderValue ?? 0)} sub={`after ${money(o?.discounts ?? 0)} discounts`} />
          <Stat loading={loading} label="Paid so far" value={money(o?.amountPaid ?? 0)} tone="text-green-600 dark:text-green-400" sub={`${o?.paid ?? 0} paid · ${o?.partial ?? 0} partial`} />
          <Stat loading={loading} label="Outstanding" value={money(o?.outstandingBalance ?? 0)} tone="text-orange-600 dark:text-orange-400" sub={`${o?.outstandingOrders ?? 0} orders`} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Daily revenue</CardTitle><CardDescription>Paid orders (excluding cancelled), by payment date</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [money(v), 'Revenue']} labelFormatter={(d) => `Day ${d}`} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>12-month revenue</CardTitle><CardDescription>Paid orders (excluding cancelled) per month</CardDescription></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64 w-full" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tickFormatter={(m: string) => MONTHS[Number(m.slice(5)) - 1].slice(0, 3)} />
                  <YAxis className="text-xs" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [money(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by payment method</CardTitle><CardDescription>Method recorded on each revenue order</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-24 w-full" /> : (rv?.methods.length ? rv.methods.map((m) => (
              <div key={m.method} className="flex items-center justify-between text-sm">
                <span className="capitalize">{m.method} <span className="text-muted-foreground">({m.orders})</span></span>
                <span>{money(m.revenue)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No revenue this month.</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by service level</CardTitle><CardDescription>Using each order's own service-level snapshot</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-24 w-full" /> : (rv?.serviceLevels.length ? rv.serviceLevels.map((l) => (
              <div key={l.level} className="flex items-center justify-between text-sm">
                <span>{l.level} <span className="text-muted-foreground">({l.orders})</span></span>
                <span>{money(l.revenue)}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No revenue this month.</p>)}
          </CardContent>
        </Card>
      </div>

      {/* REVENUE ORDERS */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue orders</CardTitle>
          <CardDescription>Paid orders (excluding cancelled) counted in {MONTHS[month - 1]} {year}</CardDescription>
          <Input placeholder="Search order, customer, phone…" value={paidSearch} onChange={(e) => setPaidSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Order</th><th className="pr-3">Customer</th><th className="pr-3">Order date</th>
                <th className="pr-3">Order status</th><th className="pr-3">Paid</th><th className="pr-3">Service level</th>
                <th className="pr-3">Method</th><th className="text-right">Amount</th>
              </tr></thead>
              <tbody>
                {(paid?.rows || []).map((r) => (
                  <tr key={r.orderId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      {r.orderNumber}
                      {r.ledgerMismatch && <Badge variant="outline" className="ml-2 border-0 bg-amber-500/15 text-amber-600">Check payment</Badge>}
                    </td>
                    <td className="pr-3">{r.customer.name}</td>
                    <td className="pr-3">{fmtDate(r.orderDate)}</td>
                    <td className="pr-3 capitalize">{r.orderStatus.replace(/[-_]/g, ' ')}</td>
                    <td className="pr-3">{fmtDate(r.paidAt || undefined)}</td>
                    <td className="pr-3">{r.serviceLevel}</td>
                    <td className="pr-3 capitalize">{r.method}</td>
                    <td className="text-right text-green-600 dark:text-green-400">{money(r.amount)}</td>
                  </tr>
                ))}
                {paid && paid.rows.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No revenue orders found.</td></tr>}
              </tbody>
            </table>
          </div>
          {paid && (
            <>
              <div className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
                <span>Revenue orders: {paid.totals.orders}</span><span>Total revenue: {money(paid.totals.revenue)}</span>
              </div>
              <PagerFooter page={paid.page} pages={paid.pages} onPage={setPaidPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* OUTSTANDING */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding / unpaid orders</CardTitle>
          <CardDescription>All orders with a balance still due, as of now (cancelled orders excluded)</CardDescription>
          <Input placeholder="Search order, customer, phone…" value={outSearch} onChange={(e) => setOutSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Order</th><th className="pr-3">Customer</th><th className="pr-3">Order date</th>
                <th className="pr-3 text-right">Order total</th><th className="pr-3 text-right">Paid</th><th className="pr-3 text-right">Outstanding</th>
                <th className="pr-3">Payment</th><th className="pr-3">Order status</th><th className="text-right">Age</th>
              </tr></thead>
              <tbody>
                {(out?.rows || []).map((r) => (
                  <tr key={r.orderId} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.orderNumber}</td>
                    <td className="pr-3">{r.customer.name}</td>
                    <td className="pr-3">{fmtDate(r.orderDate)}</td>
                    <td className="pr-3 text-right">{money(r.total)}</td>
                    <td className="pr-3 text-right">{money(r.amountPaid)}</td>
                    <td className="pr-3 text-right text-orange-600 dark:text-orange-400">{money(r.outstanding)}</td>
                    <td className="pr-3"><StateBadge state={r.paymentState} /></td>
                    <td className="pr-3 capitalize">{r.orderStatus.replace(/[-_]/g, ' ')}</td>
                    <td className="text-right">{r.ageDays}d</td>
                  </tr>
                ))}
                {out && out.rows.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">Nothing outstanding.</td></tr>}
              </tbody>
            </table>
          </div>
          {out && (
            <>
              <div className="mt-3 flex justify-between border-t pt-3 text-sm font-medium">
                <span>Outstanding orders: {out.totals.orders}</span><span>Outstanding balance: {money(out.totals.outstandingBalance)}</span>
              </div>
              <PagerFooter page={out.page} pages={out.pages} onPage={setOutPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
