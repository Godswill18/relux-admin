// ============================================================================
// STAFF ORDER DETAIL MODAL - Full read-only view of a single order
// ============================================================================

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
  Package,
  MapPin,
  Wifi,
  Store,
  Receipt,
} from 'lucide-react';
import { PriorityBadge } from '@/components/shared/StatusBadges';
import { CountdownBadge } from '@/components/shared/CountdownBadge';

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
}

export function StaffOrderDetailModal({ order, open, onOpenChange, onViewReceipt }: Props) {
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
            {order.stageDeadlineAt && (
              <CountdownBadge
                stageDeadlineAt={order.stageDeadlineAt}
                stageDurationMinutes={order.stageDurationMinutes}
                variant="full"
                className="mb-2"
              />
            )}

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

            {/* ── Items ──────────────────────────────────────────────────── */}
            {items.length > 0 && (
              <>
                <Separator className="my-1" />
                <Section title={`Items (${items.length})`} />
                <div className="space-y-4 mt-1">
                  {(() => {
                    const buildGroupKey = (item: any) => {
                      const svcType = SERVICE_LABELS[item.serviceType] ?? null;
                      if (item.serviceName && svcType && item.serviceName !== svcType) {
                        return `${item.serviceName} — ${svcType}`;
                      }
                      return item.serviceName || svcType || (item.serviceType && item.serviceType !== 'laundry' ? item.serviceType.replace(/-/g, ' ') : null) || 'Laundry';
                    };
                    const groups = new Map<string, any[]>();
                    items.forEach((item: any) => {
                      const key = buildGroupKey(item);
                      if (!groups.has(key)) groups.set(key, []);
                      groups.get(key)!.push(item);
                    });
                    return Array.from(groups.entries()).map(([groupName, groupItems]) => (
                      <div key={groupName}>
                        {/* Service group header */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">{groupName}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">{groupItems.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)} pc(s)</span>
                        </div>
                        {/* Items */}
                        <div className="rounded-lg border divide-y">
                          {groupItems.map((item: any, i: number) => (
                            <div key={item._id ?? i} className="flex items-center justify-between px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <p className="text-sm font-medium capitalize truncate">
                                  {item.itemType ?? item.name ?? `Item ${i + 1}`}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-sm font-medium">
                                  {money((item.unitPrice ?? 0) * (item.quantity ?? 1))}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ₦{(item.unitPrice ?? 0).toLocaleString()} × {item.quantity ?? 1}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}

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
