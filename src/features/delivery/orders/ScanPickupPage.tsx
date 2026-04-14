// ============================================================================
// SCAN PICKUP PAGE — Confirm pickup via barcode scan
// Mirrors DeliveryConfirmPage but calls /orders/scan-pickup
// ============================================================================

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Package,
  User, Phone, Clock, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/shared/StatusBadges';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';

export default function ScanPickupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrCode = searchParams.get('qr') ?? '';
  const { user, isAuthenticated } = useAuthStore();

  const [order, setOrder] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pickedUpAt, setPickedUpAt] = useState('');

  useEffect(() => {
    if (!qrCode) {
      setLookupError('No QR code provided. Please scan again.');
      setLookupLoading(false);
      return;
    }
    const lookup = async () => {
      try {
        const res = await apiClient.post('/orders/lookup-by-qr', { qrCode });
        if (res.data.success) {
          setOrder(res.data.data.order);
        } else {
          setLookupError(res.data.message || 'Order not found');
        }
      } catch (err: any) {
        setLookupError(
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Invalid or unrecognized QR code'
        );
      } finally {
        setLookupLoading(false);
      }
    };
    lookup();
  }, [qrCode]);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const res = await apiClient.post('/orders/scan-pickup', { qrCode });
      if (res.data.success) {
        const ts = res.data.data.order?.actualPickupDate ?? new Date().toISOString();
        setPickedUpAt(format(new Date(ts), 'MMM dd, yyyy · h:mm a'));
        setConfirmed(true);
        toast.success('Order picked up successfully');
      } else {
        throw new Error(res.data.message || 'Confirmation failed');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to confirm pickup'
      );
    } finally {
      setConfirming(false);
    }
  };

  const customer = order?.walkInCustomer ?? order?.customer;
  const items: any[] = order?.items ?? [];
  const isCancelled = order?.status === 'cancelled';
  const alreadyPickedUp = order && !['pending', 'confirmed'].includes(order.status);

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Pickup Confirmation</h1>
          <p className="text-sm text-muted-foreground">Review order before confirming pickup</p>
        </div>
      </div>

      {lookupLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Looking up order…</p>
          </CardContent>
        </Card>
      )}

      {!lookupLoading && lookupError && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-destructive">Order Not Found</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">{lookupError}</p>
            <Button variant="outline" onClick={() => navigate('/delivery/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      )}

      {confirmed && (
        <Card className="border-blue-400">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <CheckCircle2 className="h-16 w-16 text-blue-500" />
            <div className="text-center space-y-1">
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">Order Picked Up!</p>
              <p className="text-sm text-muted-foreground">Order <strong>{order?.orderNumber}</strong></p>
              <p className="text-sm text-muted-foreground">Picked up at {pickedUpAt}</p>
              <p className="text-sm text-muted-foreground">By: <strong>{user?.name}</strong></p>
            </div>
            <Button onClick={() => navigate('/delivery/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      )}

      {!lookupLoading && !lookupError && order && !confirmed && (
        <div className="space-y-4">
          {isCancelled && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-base">Order Cancelled</p>
                <p className="mt-0.5 opacity-80">This order has been cancelled.</p>
              </div>
            </div>
          )}

          {!isCancelled && alreadyPickedUp && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-400">
              <XCircle className="h-5 w-5 shrink-0" />
              <span>This order is already at status <strong>{order.status}</strong>.</span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />{order.orderNumber}
                </span>
                <OrderStatusBadge status={order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{customer?.name ?? 'Walk-in'}</span>
                </div>
                {customer?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />{customer.phone}
                  </div>
                )}
              </div>
              <Separator />
              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Items ({items.length})</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start justify-between text-sm p-2 rounded bg-muted/40">
                      <span className="font-medium">{item.itemType ?? '—'}</span>
                      <span className="text-muted-foreground">× {item.quantity ?? 1}</span>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Clock className="h-4 w-4" />Created</div>
                <span>{order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy · h:mm a') : '—'}</span>
              </div>
            </CardContent>
          </Card>

          {isAuthenticated && user && (
            <Card>
              <CardContent className="flex items-center gap-3 py-4">
                <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Authenticated as <strong>{user.name}</strong></p>
                  <p className="text-muted-foreground capitalize">Role: {user.role}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isCancelled && !alreadyPickedUp && (
            <Button className="w-full" size="lg" onClick={handleConfirm} disabled={confirming || !isAuthenticated}>
              {confirming
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming Pickup…</>
                : <><CheckCircle2 className="mr-2 h-5 w-5" />Confirm Pickup</>
              }
            </Button>
          )}

          {(isCancelled || alreadyPickedUp) && (
            <Button variant="outline" className="w-full" onClick={() => navigate('/delivery/orders')}>
              Back to Orders
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
