// ============================================================================
// DELIVERY CONFIRM PAGE
// Step 1: Look up order by scanned QR code
// Step 2: Show details + require authenticated staff to confirm delivery
// Rule:   Payment must be "paid" before delivery can be confirmed
// ============================================================================

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Package,
  User, Phone, Mail, Clock, ShieldCheck, CreditCard, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

const PAYMENT_STATUSES = [
  { value: 'unpaid',   label: 'Unpaid' },
  { value: 'paid',     label: 'Paid' },
  { value: 'partial',  label: 'Partial' },
  { value: 'refunded', label: 'Refunded' },
];

// ============================================================================
// DELIVERY CONFIRM PAGE COMPONENT
// ============================================================================

export default function DeliveryConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrCode = searchParams.get('qr') ?? '';
  const { user, isAuthenticated } = useAuthStore();
  const { fetchOrders } = useOrderStore();

  // Resolve base path based on role so staff are sent back to /staff/orders
  const isStaff = (user?.role as string)?.toLowerCase() === 'staff';
  const basePath = isStaff ? '/staff/orders' : '/admin/orders';

  const [order, setOrder] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState('');

  // Payment status update
  const [paymentStatus, setPaymentStatus] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // ── Step 1: look up order by QR ──────────────────────────────────────────
  useEffect(() => {
    if (!qrCode) {
      setLookupError('No QR code provided. Please scan again.');
      setLookupLoading(false);
      return;
    }

    const lookup = async () => {
      try {
        setLookupLoading(true);
        const res = await apiClient.post('/orders/lookup-by-qr', { qrCode });
        if (res.data.success) {
          const fetched = res.data.data.order;
          setOrder(fetched);
          setPaymentStatus(fetched.paymentStatus || fetched.payment?.status || 'unpaid');
        } else {
          setLookupError(res.data.message || 'Order not found');
        }
      } catch (err: any) {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          'Invalid or unrecognized QR code';
        setLookupError(msg);
      } finally {
        setLookupLoading(false);
      }
    };

    lookup();
  }, [qrCode]);

  // ── Update payment status ─────────────────────────────────────────────────
  const handleUpdatePayment = async (overrideStatus?: string) => {
    if (!order) return;
    const orderId = order._id || order.id;
    const newStatus = overrideStatus ?? paymentStatus;
    if (!newStatus) return;
    try {
      setUpdatingPayment(true);
      await apiClient.put(`/orders/${orderId}`, { paymentStatus: newStatus });
      setOrder((prev: any) => ({ ...prev, paymentStatus: newStatus }));
      setPaymentStatus(newStatus);
      toast.success(`Payment status updated to "${PAYMENT_STATUSES.find(p => p.value === newStatus)?.label}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // ── Quick mark as paid ────────────────────────────────────────────────────
  const handleMarkAsPaid = () => handleUpdatePayment('paid');

  // ── Step 2: confirm delivery ──────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!order) return;

    try {
      setConfirming(true);
      const res = await apiClient.post('/orders/scan-delivery', { qrCode });
      if (res.data.success) {
        const ts = res.data.data.order?.actualDeliveryDate ?? new Date().toISOString();
        setDeliveredAt(format(new Date(ts), 'MMM dd, yyyy · h:mm a'));
        setConfirmed(true);
        fetchOrders();
        toast.success('Order marked as delivered');
      } else {
        throw new Error(res.data.message || 'Confirmation failed');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to confirm delivery';
      toast.error(msg);
    } finally {
      setConfirming(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const isWalkIn = order?.orderSource === 'offline';
  const customer = isWalkIn ? order?.walkInCustomer : order?.customer;
  const items: any[] = order?.items ?? [];
  const pricing = order?.pricing ?? {};
  const isCancelled = order?.status === 'cancelled';
  const alreadyDelivered = ['delivered', 'completed'].includes(order?.status ?? '');

  // Current payment status on the order object (kept in sync after update)
  const currentPaymentStatus = order?.paymentStatus || order?.payment?.status || 'unpaid';
  const isPaid = currentPaymentStatus === 'paid';
  const paymentChanged = paymentStatus !== currentPaymentStatus;

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Delivery Confirmation</h1>
          <p className="text-sm text-muted-foreground">Review order details before confirming delivery</p>
        </div>
      </div>

      {/* ── Loading ── */}
      {lookupLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Looking up order…</p>
          </CardContent>
        </Card>
      )}

      {/* ── Lookup error ── */}
      {!lookupLoading && lookupError && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-destructive">Order Not Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">{lookupError}</p>
            <Button variant="outline" onClick={() => navigate(basePath)}>
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Confirmed success ── */}
      {confirmed && (
        <Card className="border-green-500">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-green-700 dark:text-green-400">
                Order Successfully Delivered!
              </p>
              <p className="text-sm text-muted-foreground">
                Order <strong>{order?.orderNumber}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Customer: <strong>{customer?.name ?? 'Walk-in'}</strong>
              </p>
              <p className="text-sm text-muted-foreground">Delivered at {deliveredAt}</p>
              <p className="text-sm text-muted-foreground">
                Confirmed by: <strong>{user?.name ?? 'Staff'}</strong>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => navigate(`${basePath}/delivered`)}>
                View Delivered Orders
              </Button>
              <Button onClick={() => navigate(basePath)}>Back to Orders</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Order details + confirm ── */}
      {!lookupLoading && !lookupError && order && !confirmed && (
        <div className="space-y-4">
          {/* Cancelled banner */}
          {isCancelled && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-base">Order Cancelled</p>
                <p className="mt-0.5 opacity-80">
                  This order has been cancelled and cannot be processed for delivery or payment.
                </p>
              </div>
            </div>
          )}

          {/* Already delivered warning */}
          {!isCancelled && alreadyDelivered && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>
                This order is already marked as <strong>{order.status}</strong> and cannot be confirmed again.
              </span>
            </div>
          )}

          {/* Unpaid warning — blocks delivery */}
          {!isCancelled && !alreadyDelivered && !isPaid && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-3">
              <div className="flex items-start gap-3 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Payment Required Before Delivery</p>
                  <p className="mt-0.5 text-destructive/80">
                    The customer has not completed payment for this order (current status:{' '}
                    <strong className="capitalize">{currentPaymentStatus}</strong>).
                    The customer must make payment before this order can be confirmed as delivered.
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkAsPaid}
                disabled={updatingPayment}
              >
                {updatingPayment
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating Payment…</>
                  : <><CreditCard className="mr-2 h-4 w-4" />Mark as Paid</>
                }
              </Button>
            </div>
          )}

          {/* Order summary */}
          <Card className="relative overflow-hidden">
            {/* ── Payment stamp watermark ── */}
            {(() => {
              const stampConfig: Record<string, { label: string; color: string; rotate: string }> = {
                paid:     { label: 'PAID',     color: 'text-green-600  border-green-600  dark:text-green-500  dark:border-green-500',  rotate: '-rotate-12' },
                unpaid:   { label: 'UNPAID',   color: 'text-red-500    border-red-500    dark:text-red-400    dark:border-red-400',    rotate: '-rotate-12' },
                partial:  { label: 'PARTIAL',  color: 'text-amber-500  border-amber-500  dark:text-amber-400  dark:border-amber-400',  rotate: '-rotate-12' },
                refunded: { label: 'REFUNDED', color: 'text-blue-500   border-blue-500   dark:text-blue-400   dark:border-blue-400',   rotate: '-rotate-12' },
              };
              const s = stampConfig[currentPaymentStatus] ?? stampConfig.unpaid;
              return (
                <div className={`pointer-events-none absolute inset-0 flex items-center justify-center z-10`}>
                  <span className={`${s.rotate} ${s.color} border-[3px] rounded-md px-4 py-1 text-4xl font-black tracking-widest uppercase opacity-20 select-none`}>
                    {s.label}
                  </span>
                </div>
              );
            })()}

            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {order.orderNumber}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={currentPaymentStatus} />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer info */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Customer</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{customer?.name ?? 'Walk-in Customer'}</span>
                    {isWalkIn && <Badge variant="outline" className="text-xs">Walk-in</Badge>}
                  </div>
                  {customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer?.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Items ({items.length})
                </p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items recorded</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-sm p-2 rounded-md bg-muted/40">
                        <div className="min-w-0">
                          <span className="font-medium">{item.itemType ?? '—'}</span>
                          {item.serviceType && (
                            <Badge variant="outline" className="ml-2 text-xs capitalize">
                              {item.serviceType.replace(/-/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-muted-foreground">× {item.quantity ?? 1}</span>
                          {item.unitPrice != null && (
                            <span className="ml-2 font-medium">
                              ₦{((item.unitPrice ?? 0) * (item.quantity ?? 1)).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>₦{(pricing.total ?? order.total ?? 0).toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <span>
                  {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy · h:mm a') : '—'}
                </span>
              </div>
            </CardContent>
          </Card>


          {/* Staff authentication confirmation */}
          {isAuthenticated && user && (
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Authenticated as <strong>{user.name}</strong></p>
                  <p className="text-muted-foreground capitalize">Role: {user.role}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirm button — blocked when not paid */}
          {!isCancelled && !alreadyDelivered && (
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={confirming || !isAuthenticated || !isPaid}
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming Delivery…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirm Delivery
                  </>
                )}
              </Button>
              {!isPaid && (
                <p className="text-xs text-center text-muted-foreground">
                  Delivery confirmation is disabled until payment is marked as <strong>Paid</strong>.
                </p>
              )}
            </div>
          )}

          {!isCancelled && alreadyDelivered && (
            <Button variant="outline" className="w-full" onClick={() => navigate(`${basePath}/delivered`)}>
              View Delivered Orders
            </Button>
          )}

          {isCancelled && (
            <Button variant="outline" className="w-full" onClick={() => navigate(basePath)}>
              Back to Orders
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
