// ============================================================================
// STAFF ORDER DETAIL MODAL - Full view of a single order, including where its
// garments are (ready / collected) and the counter actions for them
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  User,
  Phone,
  Shirt,
  Hash,
  CreditCard,
  Calendar,
  FileText,
  MapPin,
  Wifi,
  Store,
  Receipt,
  AlertTriangle,
} from 'lucide-react';
import { PriorityBadge } from '@/components/shared/StatusBadges';
import { OrderTimerAuto } from '@/components/shared/OrderTimer';
import { OrderGarmentsPanel, canManageGarments } from '@/components/orders/OrderGarmentsPanel';
import { OrderNotesPanel } from '@/components/orders/OrderNotesPanel';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api/client';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_LABELS: Record<string, string> = {
  'wash-fold':  'Wash & Fold',
  'wash-iron':  'Wash & Iron',
  'iron-only':  'Iron Only',
  'dry-clean':  'Dry Clean',
};

const STATUS_LABELS: Record<string, string> = {
  draft:              'Draft',
  pending:            'Pending',
  confirmed:          'Confirmed',
  in_progress:        'In Progress',
  'picked-up':        'Picked Up',
  washing:            'Washing',
  ironing:            'Ironing',
  ready:              'Ready for Collection',
  'out-for-delivery': 'Out for Delivery',
  delivered:          'Delivered',
  completed:          'Completed',
  cancelled:          'Cancelled',
};

// ============================================================================
// HELPERS
// ============================================================================

function statusVariant(status: string) {
  if (status === 'cancelled') return 'destructive';
  if (status === 'completed' || status === 'delivered' || status === 'ready') return 'default';
  return 'secondary';
}

function serviceLabel(value?: string | null) {
  if (!value) return null;
  return SERVICE_LABELS[value] ?? value.replace(/-/g, ' ');
}

function fmt(date?: string | null) {
  if (!date) return '—';
  try { return format(new Date(date), 'MMM dd, yyyy · hh:mm a'); }
  catch { return '—'; }
}

function money(n?: number | null) {
  if (n == null) return '—';
  return `₦${Number(n).toLocaleString()}`;
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pt-2">
      {title}
    </p>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

interface Props {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewReceipt?: (order: any) => void;
  /** Called after garments are marked ready or collected, so lists can refresh */
  onChanged?: () => void;
}

export function StaffOrderDetailModal({ order: listOrder, open, onOpenChange, onViewReceipt, onChanged }: Props) {
  const role = useAuthStore((st) => st.user?.role) as string | undefined;
  // The list row lacks collection history and garment activity — load the full
  // order when the modal opens, and again after every garment action.
  const [full, setFull] = useState<any>(null);
  const orderId = listOrder?._id || listOrder?.id;
  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await apiClient.get(`/orders/${orderId}`);
      setFull(res.data?.data?.order || null);
    } catch {
      // Keep showing the list row; the panel still works from it
    }
  }, [orderId]);
  useEffect(() => {
    setFull(null);
    if (open) load();
  }, [open, load]);

  const order = full && String(full._id) === String(orderId) ? full : listOrder;
  if (!order) return null;

  const isWalkIn = order.orderSource === 'offline';
  const customerName  = order.walkInCustomer?.name  || order.customer?.name  || 'Unknown';
  const customerPhone = order.walkInCustomer?.phone || order.customer?.phone || null;
  const customerEmail = order.customer?.email || null;

  const items: any[]   = order.items   ?? [];
  const pricing        = order.pricing  ?? {};
  const payment        = order.payment  ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono">{order.orderNumber ?? 'Order'}</span>
            <Badge variant={statusVariant(order.status)} className="capitalize text-xs">
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
            <PriorityBadge serviceLevel={order.serviceLevel} rush={order.rush} priorityLevel={order.serviceLevelId?.priorityLevel} />
            {/* Order source badge */}
            {isWalkIn ? (
              <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-600">
                <Store className="h-3 w-3" />
                Walk-in
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 border-blue-400 text-blue-600">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Full details for this order</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-1">
          <div className="space-y-1 pb-2">

            {/* ── Stage Countdown Timer ────────────────────────────────── */}
            <OrderTimerAuto order={order} variant="full" className="mb-2" />

            {/* ── Customer ───────────────────────────────────────────────── */}
            <Section title="Customer" />
            <Row icon={User}  label="Name"  value={customerName} />
            {customerPhone && <Row icon={Phone} label="Phone" value={customerPhone} />}
            {customerEmail && <Row icon={Phone} label="Email" value={customerEmail} />}

            <Separator className="my-1" />

            {/* ── Order Details ───────────────────────────────────────────── */}
            <Section title="Order Details" />
            <Row icon={Hash}     label="Order Number" value={<span className="font-mono">{order.orderNumber}</span>} />
            <Row icon={Shirt}    label="Order Type" value={
              isWalkIn ? (
                <Badge variant="outline" className="text-xs border-orange-400 text-orange-600">Walk-in</Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-blue-400 text-blue-600">Online</Badge>
              )
            } />
            {order.serviceType && (
              <Row icon={Shirt} label="Default Service" value={
                <Badge variant="outline" className="capitalize text-xs">
                  {serviceLabel(order.serviceType)}
                </Badge>
              } />
            )}
            <Row icon={Calendar} label="Created"      value={fmt(order.createdAt)} />
            {order.updatedAt && (
              <Row icon={Calendar} label="Last Updated" value={fmt(order.updatedAt)} />
            )}
            {order.pickupAddress && (
              <Row icon={MapPin} label="Pickup Address" value={
                [order.pickupAddress.street, order.pickupAddress.city, order.pickupAddress.state]
                  .filter(Boolean).join(', ')
              } />
            )}
            {order.deliveryAddress && (
              <Row icon={MapPin} label="Delivery Address" value={
                [order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.state]
                  .filter(Boolean).join(', ')
              } />
            )}
            {order.specialInstructions && (
              <Row icon={FileText} label="Special Instructions" value={order.specialInstructions} />
            )}

            {/* ── Add-ons ────────────────────────────────────────────────── */}
            {(order.addons || []).length > 0 && (
              <>
                <Separator className="my-1" />
                <Section title={`Add-ons (${(order.addons as any[]).length})`} />
                <div className="rounded-lg border divide-y mt-1">
                  {(order.addons as any[]).map((addon: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-sm font-medium">{addon.name || addon.addonId?.name || '—'}</span>
                      <span className="text-sm font-semibold shrink-0 ml-4">+₦{(addon.calculatedAmount ?? 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Items & garments ───────────────────────────────────────── */}
            {items.length > 0 && (
              <>
                <Separator className="my-1" />
                <Section title={`Items (${items.reduce((n: number, i: any) => n + (i.quantity || 0), 0)} garments)`} />
                <div className="mt-1">
                  <OrderGarmentsPanel
                    order={order}
                    canManage={canManageGarments(role)}
                    onChanged={() => { load(); onChanged?.(); }}
                  />
                </div>
              </>
            )}

            {/* ── Internal staff notes ──────────────────────────────────── */}
            <Separator className="my-1" />
            <div className="mt-1">
              <OrderNotesPanel orderId={orderId} items={order.items} />
            </div>

            {/* ── Pricing ────────────────────────────────────────────────── */}
            {Object.keys(pricing).length > 0 && (
              <>
                <Separator className="my-1" />
                <Section title="Pricing" />
                <div className="rounded-lg border divide-y mt-1 text-sm">
                  {pricing.subtotal != null && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{money(pricing.subtotal)}</span>
                    </div>
                  )}
                  {!!pricing.pickupFee && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Pickup Fee</span>
                      <span>{money(pricing.pickupFee)}</span>
                    </div>
                  )}
                  {!!pricing.deliveryFee && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>{money(pricing.deliveryFee)}</span>
                    </div>
                  )}
                  {!!pricing.discount && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">-{money(pricing.discount)}</span>
                    </div>
                  )}
                  {!!pricing.tax && (
                    <div className="flex justify-between px-3 py-2">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{money(pricing.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2.5 font-semibold bg-muted/40">
                    <span>Total</span>
                    <span>{money(pricing.total)}</span>
                  </div>
                </div>
              </>
            )}

            {/* ── Payment ────────────────────────────────────────────────── */}
            <Separator className="my-1" />
            <Section title="Payment" />
            <Row icon={CreditCard} label="Method" value={
              payment.method
                ? <Badge variant="outline" className="capitalize text-xs">{payment.method}</Badge>
                : '—'
            } />
            <Row icon={CreditCard} label="Status" value={
              payment.status
                ? <Badge
                    variant={payment.status === 'paid' ? 'default' : 'secondary'}
                    className="capitalize text-xs"
                  >
                    {payment.status}
                  </Badge>
                : '—'
            } />
            {payment.paidAt && (
              <Row icon={Calendar} label="Paid At" value={fmt(payment.paidAt)} />
            )}

            {/* ── Assigned Staff ──────────────────────────────────────────── */}
            {order.assignedStaff && (
              <>
                <Separator className="my-1" />
                <Section title="Assigned Staff" />
                <Row
                  icon={User}
                  label="Staff Member"
                  value={order.assignedStaff?.name ?? order.assignedStaff}
                />
              </>
            )}

            {/* ── Cancellation Reason ─────────────────────────────────────── */}
            {order.status === 'cancelled' && order.notes && (
              <>
                <Separator className="my-1" />
                <Section title="Cancellation" />
                <Row
                  icon={AlertTriangle}
                  label="Reason"
                  value={
                    order.notes.startsWith('Cancelled: ')
                      ? order.notes.slice('Cancelled: '.length)
                      : order.notes
                  }
                />
              </>
            )}

          </div>
        </ScrollArea>

        {onViewReceipt && (
          <DialogFooter className="pt-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onViewReceipt(order)}>
              <Receipt className="mr-2 h-4 w-4" />
              View Receipt & Barcode
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
