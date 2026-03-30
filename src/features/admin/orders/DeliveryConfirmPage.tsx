// ============================================================================
// DELIVERY CONFIRM PAGE
// Step 1: Look up order by scanned QR code
// Step 2: Show details + require authenticated staff to confirm delivery
// ============================================================================

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Package,
  User, Phone, Mail, Clock, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/shared/StatusBadges';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOrderStore } from '@/stores/useOrderStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

// ============================================================================
// DELIVERY CONFIRM PAGE COMPONENT
// ============================================================================

export default function DeliveryConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrCode = searchParams.get('qr') ?? '';
  const { user, isAuthenticated } = useAuthStore();
  const { fetchOrders } = useOrderStore();

  const [order, setOrder] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deliveredAt, setDeliveredAt] = useState('');

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
          setOrder(res.data.data.order);
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
        fetchOrders(); // refresh background list
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
  const alreadyDelivered = ['delivered', 'completed'].includes(order?.status ?? '');

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Delivery Confirmation</h1>
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
            <Button variant="outline" onClick={() => navigate('/admin/orders')}>
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
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate('/admin/orders/delivered')}>
                View Delivered Orders
              </Button>
              <Button onClick={() => navigate('/admin/orders')}>Back to Orders</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Order details + confirm ── */}
      {!lookupLoading && !lookupError && order && !confirmed && (
        <div className="space-y-4">
          {/* Already delivered warning */}
          {alreadyDelivered && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>
                This order is already marked as <strong>{order.status}</strong> and cannot be confirmed again.
              </span>
            </div>
          )}

          {/* Order summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {order.orderNumber}
                </span>
                <OrderStatusBadge status={order.status} />
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
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
                        <div>
                          <span className="font-medium">{item.itemType ?? '—'}</span>
                          {item.serviceType && (
                            <Badge variant="outline" className="ml-2 text-xs capitalize">
                              {item.serviceType.replace(/-/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground">× {item.quantity ?? 1}</span>
                          {item.unitPrice != null && (
                            <span className="ml-3 font-medium">
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

          {/* Confirm button */}
          {!alreadyDelivered && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleConfirm}
              disabled={confirming || !isAuthenticated}
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
          )}

          {alreadyDelivered && (
            <Button variant="outline" className="w-full" onClick={() => navigate('/admin/orders/delivered')}>
              View Delivered Orders
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
