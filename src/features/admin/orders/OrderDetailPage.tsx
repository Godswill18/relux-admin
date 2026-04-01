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
  ScanLine,
  AlertTriangle,
} from 'lucide-react';
import { OrderReceiptModal } from './OrderReceiptModal';
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
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/shared/StatusBadges';
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
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {order.orderNumber || order.code || `Order #${order._id?.substring(0, 8)}`}
            </h1>
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
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item: any, idx: number) => {
                    const svc = serviceLabel(item.serviceType);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="min-w-0">
                          <div className="font-medium">{item.itemType || '—'}</div>
                          {svc && (
                            <Badge variant="outline" className="capitalize text-xs mt-1">
                              {svc}
                            </Badge>
                          )}
                          {item.description && (
                            <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                          )}
                          {item.condition && (
                            <div className="text-xs text-muted-foreground">Condition: {item.condition}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                          {item.unitPrice != null && (
                            <div className="font-medium">₦{(item.unitPrice * item.quantity).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                {pricing.pickupFee > 0 && (
                  <div className="flex justify-between">
                    <span>Pickup Fee</span>
                    <span>₦{pricing.pickupFee.toLocaleString()}</span>
                  </div>
                )}
                {pricing.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>₦{pricing.deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                {pricing.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-₦{pricing.discount.toLocaleString()}</span>
                  </div>
                )}
                {pricing.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>₦{pricing.tax.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>₦{(pricing.total || order.total || 0).toLocaleString()}</span>
                </div>
              </div>

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

          {/* Addresses (if pickup-delivery) */}
          {order.orderType === 'pickup-delivery' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Addresses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {order.pickupAddress && (
                    <div className="p-3 border rounded-lg space-y-1">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Pickup Address
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.pickupAddress.street}
                        {order.pickupAddress.city && `, ${order.pickupAddress.city}`}
                        {order.pickupAddress.state && `, ${order.pickupAddress.state}`}
                      </div>
                    </div>
                  )}
                  {order.deliveryAddress && (
                    <div className="p-3 border rounded-lg space-y-1">
                      <div className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Delivery Address
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.deliveryAddress.street}
                        {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
                        {order.deliveryAddress.state && `, ${order.deliveryAddress.state}`}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Type</span>
                <span className="font-medium capitalize">{order.orderType?.replace('-', ' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Service</span>
                <span className="font-medium capitalize">{serviceLabel(order.serviceType) || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Level</span>
                <Badge variant="outline" className="capitalize">{order.serviceLevel || 'standard'}</Badge>
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
