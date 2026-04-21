// ============================================================================
// ORDER DETAIL PAGE - Full Order View
// ============================================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CreditCard,
  Truck,
  FileText,
  CheckCircle,
  UserPlus,
  Loader2,
  Store,
  Wifi,
  Printer,
  AlertTriangle,
  Pencil,
  Wallet,
  History,
} from 'lucide-react';
import { OrderReceiptModal } from './OrderReceiptModal';
import { EditOrderModal } from './EditOrderModal';
import { CountdownBadge } from '@/components/shared/CountdownBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrderStore } from '@/stores/useOrderStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';
import { OrderStatusBadge, PaymentStatusBadge, PriorityBadge } from '@/components/shared/StatusBadges';
import { getOrderStatusConfig } from '@/lib/statusConfig';

// ============================================================================
// STATUS HELPERS
// ============================================================================

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'picked-up',
  'in_progress',
  'washing',
  'ironing',
  'ready',
  'out-for-delivery',
  'delivered',
  'completed',
  'cancelled',
] as const;

function statusLabel(status: string) {
  return getOrderStatusConfig(status).label;
}

const SERVICE_LABELS: Record<string, string> = {
  'wash-fold':  'Wash & Fold',
  'wash-iron':  'Wash & Iron',
  'iron-only':  'Iron Only',
  'dry-clean':  'Dry Clean',
};

function serviceLabel(value?: string | null) {
  if (!value) return null;
  return SERVICE_LABELS[value] ?? value.replace(/-/g, ' ');
}

// ============================================================================
// ORDER DETAIL PAGE COMPONENT
// ============================================================================

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateOrderStatus, assignStaff } = useOrderStore();
  const { staff: staffList, fetchStaff } = useStaffStore();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [staffFetched, setStaffFetched] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isChargingWallet, setIsChargingWallet] = useState(false);

  // Fetch single order
  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/orders/${id}`);
        if (response.data.success) {
          const raw = response.data.data;
          setOrder(raw?.order || raw);
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Fetch staff list for assignment dropdown
  useEffect(() => {
    if (!staffFetched && staffList.length === 0) {
      fetchStaff().then(() => setStaffFetched(true));
    }
  }, [staffFetched, staffList.length, fetchStaff]);

  // Real-time: update countdown deadline when backend emits timer-updated for this order
  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket || !id) return;
    const handler = (data: { orderId: string; stageDeadlineAt: string | null; stageDurationMinutes: number | null }) => {
      if (data.orderId !== id) return;
      setOrder((prev: any) =>
        prev ? { ...prev, stageDeadlineAt: data.stageDeadlineAt, stageDurationMinutes: data.stageDurationMinutes } : prev
      );
    };
    socket.on('order:timer-updated', handler);
    return () => { socket.off('order:timer-updated', handler); };
  }, [id]);

  // Fetch customer wallet balance for partial or wallet/pay-later unpaid orders
  useEffect(() => {
    if (!order) return;
    const isPartial = order.paymentStatus === 'partial';
    const isWalletUnpaid = order.paymentStatus === 'unpaid' && ['pay-later', 'wallet'].includes(order.payment?.method);
    if (!isPartial && !isWalletUnpaid) return;
    const customerId = order.customer?.customerId?._id
      || (typeof order.customer?.customerId === 'string' ? order.customer.customerId : null)
      || order.customerId;
    if (!customerId) return;
    apiClient.get(`/wallets/customer/${customerId}`)
      .then((res) => {
        const bal = res.data?.data?.wallet?.balance ?? res.data?.data?.balance ?? null;
        setWalletBalance(bal);
      })
      .catch(() => setWalletBalance(null));
  }, [order?.paymentStatus, order?.payment?.method, order?.customer, order?.customerId]);

  // Charge remaining balance from customer's wallet
  const handlePayBalance = async () => {
    if (!id || !order) return;
    setIsChargingWallet(true);
    try {
      const res = await apiClient.post(`/orders/${id}/pay-balance`);
      const { order: updated, amountCharged, walletBalance: newBal } = res.data.data;
      setOrder((prev: any) => ({
        ...prev,
        paymentStatus: 'paid',
        payment: { ...prev.payment, status: 'paid', amount: prev.total },
        ...(updated || {}),
      }));
      setWalletBalance(newBal);
      toast.success(`₦${amountCharged.toLocaleString()} charged from wallet. Order fully paid.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to charge wallet');
    } finally {
      setIsChargingWallet(false);
    }
  };

  // Handle staff assignment
  const handleAssignStaff = async (staffId: string) => {
    if (!id) return;
    try {
      setIsAssigningStaff(true);
      await assignStaff(id, staffId);
      // Update local order state with the assigned staff info
      const assigned = staffList.find((s: any) => (s._id || s.id) === staffId);
      if (assigned) {
        setOrder((prev: any) => ({ ...prev, assignedStaff: assigned }));
      }
      toast.success('Staff assigned successfully');
    } catch {
      toast.error('Failed to assign staff');
    } finally {
      setIsAssigningStaff(false);
    }
  };

  // Handle status change — block delivery/completion if payment is not paid
  const DELIVERY_STATUSES = ['delivered', 'completed'];
  const handleStatusChange = async (newStatus: string) => {
    if (!id || !order) return;

    const currentPayment = order.paymentStatus || order.payment?.status || 'unpaid';
    if (DELIVERY_STATUSES.includes(newStatus) && currentPayment !== 'paid') {
      toast.error(
        `Cannot mark as "${statusLabel(newStatus)}" — payment status is "${currentPayment}". Mark the order as Paid first.`
      );
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await updateOrderStatus(id, newStatus as any);
      setOrder((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Order status updated to ${statusLabel(newStatus)}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle payment status change
  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!id || !order) return;
    try {
      setIsUpdatingPayment(true);
      await apiClient.put(`/orders/${id}`, { paymentStatus: newStatus });
      setOrder((prev: any) => ({ ...prev, paymentStatus: newStatus }));
      toast.success(`Payment status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update payment status');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Handle payment method change
  const handlePaymentMethodChange = async (newMethod: string) => {
    if (!id || !order) return;
    try {
      setIsUpdatingPayment(true);
      await apiClient.put(`/orders/${id}/payment`, { method: newMethod });
      setOrder((prev: any) => ({
        ...prev,
        payment: { ...prev.payment, method: newMethod },
      }));
      toast.success(`Payment method updated to ${newMethod}`);
    } catch {
      toast.error('Failed to update payment method');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    );
  }

  // Not found
  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Order not found</div>
        </div>
      </div>
    );
  }

  const customer = order.customer;
  const pricing = order.pricing || {};
  const payment = order.payment || {};
  const items = order.items || [];
  const statusHistory = order.statusHistory || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: back + title */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                {order.orderNumber || order.code || `Order #${order._id?.substring(0, 8)}`}
              </h1>
              <PriorityBadge serviceLevel={order.serviceLevel} rush={order.rush} priorityLevel={order.serviceLevelId?.priorityLevel} />
            </div>
            <p className="text-sm text-muted-foreground">
              Created {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy · h:mm a') : '—'}
            </p>
          </div>
        </div>
        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap pl-10 sm:pl-0">
          <Button variant="outline" size="sm" onClick={() => setIsReceiptOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Print </span>Receipt
          </Button>
          {!['completed', 'delivered', 'cancelled'].includes(order.status) && (
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Order
            </Button>
          )}
          <OrderStatusBadge status={order.status} />
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={isUpdatingStatus}
          >
            <SelectTrigger className="w-40 sm:w-48">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => {
                const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';
                const blocked = ['delivered', 'completed'].includes(s) && payStatus !== 'paid';
                return (
                  <SelectItem key={s} value={s} disabled={blocked}>
                    {statusLabel(s)}{blocked ? ' (payment required)' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrderReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        order={order}
      />

      <EditOrderModal
        key={order?._id || 'no-order'}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        order={order}
        onSaved={(updated) => setOrder(updated)}
      />

      {/* Payment gate warning — shown when order is approaching delivery but not paid */}
      {(() => {
        const payStatus = order.paymentStatus || order.payment?.status || 'unpaid';
        const nearDelivery = ['ready', 'out-for-delivery', 'delivered', 'completed'].includes(order.status);
        if (nearDelivery && payStatus !== 'paid') {
          return (
            <div className="flex items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Payment Not Confirmed</p>
                <p className="text-destructive/80 mt-0.5">
                  This order's payment status is <strong className="capitalize">{payStatus}</strong>.
                  Update the payment status to <strong>Paid</strong> before marking the order as Delivered or Completed.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(order.addons || []).length > 0 && (
                <div className="mb-4 pb-4 border-b">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Add-ons</p>
                  <div className="rounded-lg border divide-y">
                    {(order.addons as any[]).map((addon: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                        <div className="text-sm font-medium">{addon.name || addon.addonId?.name || '—'}</div>
                        <div className="text-sm font-semibold shrink-0 ml-4">
                          +₦{(addon.calculatedAmount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items</p>
              ) : (() => {
                // Build group key: "Service Name — Type" e.g. "Washing — Wash & Iron"
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
                return (
                  <div className="space-y-5">
                    {Array.from(groups.entries()).map(([groupName, groupItems]) => (
                      <div key={groupName}>
                        {/* Service group header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary">{groupName}</span>
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">{groupItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0)} pc(s)</span>
                        </div>
                        {/* Items under this service */}
                        <div className="rounded-lg border divide-y">
                          {groupItems.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-3">
                              <div className="min-w-0">
                                <div className="font-medium">{item.itemType || '—'}</div>
                                {item.condition && (
                                  <div className="text-xs text-muted-foreground mt-0.5">Condition: {item.condition}</div>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <div className="font-semibold">₦{((item.unitPrice ?? 0) * (item.quantity ?? 1)).toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">₦{(item.unitPrice ?? 0).toLocaleString()} × {item.quantity ?? 1}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pricing & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{(pricing.subtotal || 0).toLocaleString()}</span>
                </div>
                {(pricing.serviceFee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Service Level ({order.serviceLevel || 'standard'})</span>
                    <span>₦{pricing.serviceFee.toLocaleString()}</span>
                  </div>
                )}
                {(pricing.pickupFee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Pickup Fee</span>
                    <span>₦{pricing.pickupFee.toLocaleString()}</span>
                  </div>
                )}
                {(pricing.deliveryFee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₦{pricing.deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                {(pricing.addOnsFee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons</span>
                    <span>₦{pricing.addOnsFee.toLocaleString()}</span>
                  </div>
                )}
                {(pricing.discount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₦{pricing.discount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₦{(pricing.total || order.total || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* ── Wallet Deduction Panel (partial or wallet/pay-later unpaid) ── */}
              {(order.paymentStatus === 'partial' || (order.paymentStatus === 'unpaid' && ['pay-later', 'wallet'].includes(payment.method))) && (() => {
                const isFullyUnpaid = order.paymentStatus === 'unpaid';
                const alreadyPaid   = isFullyUnpaid ? 0 : (payment.amount || 0);
                const orderTotal  = pricing.total || order.total || 0;
                const balanceDue  = Math.max(0, Math.round((orderTotal - alreadyPaid) * 100) / 100);
                return (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {isFullyUnpaid ? 'Payment Due — Deduct from Wallet' : 'Partial Payment — Balance Outstanding'}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {!isFullyUnpaid && (
                        <div>
                          <p className="text-xs text-muted-foreground">Previously Paid</p>
                          <p className="font-semibold text-green-700">₦{alreadyPaid.toLocaleString()}</p>
                        </div>
                      )}
                      <div className={isFullyUnpaid ? 'col-span-2' : ''}>
                        <p className="text-xs text-muted-foreground">Order Total</p>
                        <p className="font-semibold">₦{orderTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{isFullyUnpaid ? 'Amount Due' : 'Balance Due'}</p>
                        <p className="font-semibold text-destructive">₦{balanceDue.toLocaleString()}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={handlePayBalance}
                      disabled={isChargingWallet}
                    >
                      {isChargingWallet
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Wallet className="h-4 w-4" />}
                      Deduct ₦{balanceDue.toLocaleString()} from Wallet
                      {walletBalance !== null && (
                        <span className="ml-auto text-xs opacity-75">
                          Balance: ₦{walletBalance.toLocaleString()}
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })()}

              <Separator />

              {/* Payment Method */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <Select
                  value={payment.method || 'cash'}
                  onValueChange={handlePaymentMethodChange}
                  disabled={isUpdatingPayment}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="pay-later">Pay Later</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Select
                  value={order.paymentStatus || 'unpaid'}
                  onValueChange={handlePaymentStatusChange}
                  disabled={isUpdatingPayment}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {payment.paidAt && (
                <div className="text-xs text-muted-foreground">
                  Paid on {format(new Date(payment.paidAt), 'MMM dd, yyyy · h:mm a')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logistics — Pickup/Delivery Details */}
          {(() => {
            const method = (order.pickupMethod || '').toLowerCase();
            if (method === 'drop_off') return null;

            const zone = order.deliveryZoneId;
            const pickupWin = order.pickupWindowId;
            const scheduleDate = order.pickupDate || order.deliveryDate;
            const scheduleTime = order.scheduledPickupTime;

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {method === 'pickup' ? 'Pickup & Delivery Details' : 'Delivery Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pickup Address — PICKUP only */}
                  {method === 'pickup' && order.pickupAddress && (
                    <div className="p-3 border rounded-lg space-y-1">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Pickup Address
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.pickupAddress.street}
                        {order.pickupAddress.landmark && `, ${order.pickupAddress.landmark}`}
                        {order.pickupAddress.city && `, ${order.pickupAddress.city}`}
                        {order.pickupAddress.state && `, ${order.pickupAddress.state}`}
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  {scheduleDate && (
                    <div className="p-3 border rounded-lg space-y-1">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {method === 'pickup' ? 'Pickup Schedule' : 'Delivery Schedule'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(scheduleDate), 'MMM dd, yyyy')}
                        {scheduleTime && <span className="ml-2">· {scheduleTime}</span>}
                        {pickupWin && typeof pickupWin === 'object' && !scheduleTime && (
                          <span className="ml-2">· {pickupWin.startTime} – {pickupWin.endTime}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delivery Zone */}
                  {zone && (
                    <div className="p-3 border rounded-lg space-y-1">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Delivery Zone
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {typeof zone === 'object' ? zone.name : zone}
                        {typeof zone === 'object' && zone.radiusKm && ` (${zone.radiusKm} km radius)`}
                      </div>
                      {typeof zone === 'object' && zone.fee > 0 && (
                        <div className="text-xs text-muted-foreground">Fee: ₦{zone.fee.toLocaleString()}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusHistory.map((entry: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={entry.status} />
                          <span className="text-xs text-muted-foreground">
                            {entry.timestamp
                              ? format(new Date(entry.timestamp), 'MMM dd, yyyy · h:mm a')
                              : '—'}
                          </span>
                        </div>
                        {entry.updatedBy && (
                          <div className="text-xs text-muted-foreground mt-1">
                            by {entry.updatedBy?.name || 'System'}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-sm mt-1">{entry.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit History */}
          {(order.editHistory || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Edit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(order.editHistory as any[]).map((entry: any, idx: number) => {
                    const diff = entry.difference ?? 0;
                    const isRefund = diff > 0;
                    const isExtra  = diff < 0;
                    return (
                      <div key={idx} className="space-y-1.5 border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {entry.editedAt
                              ? format(new Date(entry.editedAt), 'MMM dd, yyyy · h:mm a')
                              : '—'}
                            {entry.editedBy?.name && (
                              <span className="ml-1">by <strong>{entry.editedBy.name}</strong></span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground line-through">
                              ₦{(entry.previousTotal || 0).toLocaleString()}
                            </span>
                            <span className="text-xs">→</span>
                            <span className="text-xs font-medium">
                              ₦{(entry.newTotal || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {isRefund && (
                          <div className="flex items-center gap-1.5 text-xs text-green-700">
                            <Wallet className="h-3 w-3 shrink-0" />
                            {entry.refundIssued
                              ? `₦${diff.toLocaleString()} refunded to wallet`
                              : `₦${diff.toLocaleString()} overpaid — manual refund may be required`}
                          </div>
                        )}
                        {isExtra && (
                          <div className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            ₦{Math.abs(diff).toLocaleString()} additional payment required
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Stage Countdown Timer */}
          {order.stageDeadlineAt && (
            <CountdownBadge
              stageDeadlineAt={order.stageDeadlineAt}
              stageDurationMinutes={order.stageDurationMinutes}
              variant="full"
            />
          )}

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Source</span>
                {order.orderSource === 'offline' ? (
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
              </div>
              {/* <div className="flex justify-between">
                <span className="text-muted-foreground">Order Type</span>
                <span className="font-medium capitalize">{order.orderType?.replace('-', ' ') || '—'}</span>
                {console.log(order)}
              </div> */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Service</span>
                <span className="font-medium capitalize">{serviceLabel(order.serviceType) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Level</span>
                <Badge variant="outline" className="capitalize">{order.serviceLevel || 'standard'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pickup & Delivery Method</span>
                <Badge variant="outline" className="capitalize">{order.pickupMethod}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <Badge variant="outline" className="capitalize">{order.payment.method}</Badge>
              </div>
              {order.qrCode && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">QR Code</span>
                    <span className="font-mono text-[10px] truncate max-w-[130px]">{order.qrCode}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.orderSource === 'offline' && order.walkInCustomer ? (
                <>
                  <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 mb-1">
                    Walk-in (no account)
                  </Badge>
                  <div className="font-medium">{order.walkInCustomer.name}</div>
                  {order.walkInCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {order.walkInCustomer.phone}
                    </div>
                  )}
                </>
              ) : customer ? (
                <>
                  <div className="font-medium">{customer.name}</div>
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No customer info</p>
              )}
            </CardContent>
          </Card>

          {/* Assigned Staff */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <UserPlus className="h-4 w-4" />
                Assigned Staff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Current assignment display */}
              {order.assignedStaff && (
                <div className="p-3 border rounded-lg space-y-1">
                  <div className="font-medium">{order.assignedStaff.name}</div>
                  {order.assignedStaff.staffRole && (
                    <Badge variant="outline" className="capitalize text-xs">
                      {order.assignedStaff.staffRole}
                    </Badge>
                  )}
                  {order.assignedStaff.phone && (
                    <div className="text-sm text-muted-foreground">{order.assignedStaff.phone}</div>
                  )}
                </div>
              )}

              {/* Staff assignment selector */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {order.assignedStaff ? 'Reassign to' : 'Assign to'}
                </label>
                <Select
                  value=""
                  onValueChange={handleAssignStaff}
                  disabled={isAssigningStaff}
                >
                  <SelectTrigger className="w-full">
                    {isAssigningStaff ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Assigning...
                      </span>
                    ) : (
                      <SelectValue placeholder="Select staff member" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {staffList
                      .filter((s: any) => s.isActive !== false)
                      .map((s: any) => {
                        const sId = s._id || s.id;
                        const currentId = order.assignedStaff?._id || order.assignedStaff?.id;
                        return (
                          <SelectItem
                            key={sId}
                            value={sId}
                            disabled={sId === currentId}
                          >
                            {s.name}{s.staffRole ? ` (${s.staffRole})` : ''}
                          </SelectItem>
                        );
                      })}
                    {staffList.filter((s: any) => s.isActive !== false).length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No staff available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.specialInstructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
