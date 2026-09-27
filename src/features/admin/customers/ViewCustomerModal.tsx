// ============================================================================
// VIEW CUSTOMER MODAL - Read-only customer details view, with the customer's
// order history (walk-in and online) and where each order's garments are
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ModalForm } from '@/components/shared/ModalForm';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PortalStatusBadge } from '@/components/shared/StatusBadges';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useHasPermission } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { format } from 'date-fns';
import { Loader2, User, Phone, Mail, MapPin, Award, Wallet, Calendar, Package } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { OrderStatusBadge } from '@/components/shared/StatusBadges';
import { StaffOrderDetailModal } from '@/features/staff/orders/StaffOrderDetailModal';
import { fulfilmentOf, naira } from '@/lib/orderLines';

/** "12 garments · 8 collected · 2 ready · 2 processing" */
function garmentLine(order: any): string {
  const f = fulfilmentOf(order);
  if (!f.totalGarments) return 'No items';
  const parts = [`${f.totalGarments} garment${f.totalGarments === 1 ? '' : 's'}`];
  if (order.status === 'cancelled') return parts[0];
  if (f.collectedGarments) parts.push(`${f.collectedGarments} collected`);
  if (f.awaitingCollection) parts.push(`${f.awaitingCollection} ready`);
  if (f.processingGarments) parts.push(`${f.processingGarments} processing`);
  return parts.join(' · ');
}

// ============================================================================
// COMPONENT
// ============================================================================

interface ViewCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '—'}</p>
      </div>
    </div>
  );
}

export function ViewCustomerModal({ open, onOpenChange, customer }: ViewCustomerModalProps) {
  const { fetchWallet } = useCustomerStore();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const customerDoc = customer?.customerId;
  const customerId = customerDoc?._id || customerDoc?.id;
  const navigate = useNavigate();
  const canOpenOrderPage = useHasPermission(Permission.VIEW_ORDERS);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [openOrder, setOpenOrder] = useState<any>(null);

  // Order history by customer record — includes walk-in orders
  useEffect(() => {
    if (!open || !customerId) { setOrders(null); return; }
    let cancelled = false;
    apiClient.get('/orders', { params: { customerId, limit: 20 } })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.data?.data?.orders ?? []);
        setOrdersTotal(res.data?.pagination?.total ?? 0);
      })
      .catch(() => { if (!cancelled) setOrders([]); });
    return () => { cancelled = true; };
  }, [open, customerId]);

  const showOrder = (order: any) => {
    // The full order page when this user may open it; otherwise the order modal
    if (canOpenOrderPage) {
      onOpenChange(false);
      navigate(`/admin/orders/${order._id}`);
    } else {
      setOpenOrder(order);
    }
  };

  useEffect(() => {
    if (!open) return;
    setWalletBalance(null);
    if (!customerId) {
      setWalletBalance(0);
      return;
    }
    setWalletLoading(true);
    fetchWallet(customerId)
      .then((wallet) => setWalletBalance(wallet?.balance ?? 0))
      .catch(() => setWalletBalance(0))
      .finally(() => setWalletLoading(false));
  }, [open, customerId, fetchWallet]);

  if (!customer) return null;

  const tier = customerDoc?.loyaltyTierId;
  const loyaltyPoints = customerDoc?.loyaltyPointsBalance ?? 0;

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Customer Details"
      description={`Viewing profile for ${customer.name}`}
    >
      <div className="space-y-5">
        {/* Identity */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Personal Info
          </p>
          <div className="grid grid-cols-1 gap-3">
            <InfoRow icon={User} label="Full Name" value={customer.name} />
            <InfoRow icon={Phone} label="Phone" value={customer.phone} />
            <InfoRow icon={Mail} label="Email" value={customer.email} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={[customerDoc?.address, customerDoc?.city].filter(Boolean).join(', ') || null}
            />
          </div>
        </div>

        <Separator />

        {/* Account status */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Account
          </p>
          {/* One status, from the field that actually controls access
              (User.isActive). This used to show Customer.status and an
              "Active: Yes/No" side by side, which could disagree. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Customer Status</p>
              <Badge
                variant={customer.isActive === false ? 'destructive' : 'default'}
                className="mt-1"
              >
                {customer.isActive === false ? 'Deactivated' : 'Active'}
              </Badge>
            </div>
            <div>
              {/* Online access — separate from being a customer. */}
              <p className="text-xs text-muted-foreground">Portal Account</p>
              <div className="mt-1"><PortalStatusBadge status={customer.portalStatus} /></div>
            </div>
          </div>
          {customer.portalStatus === 'UNREGISTERED' && (
            <p className="text-xs text-muted-foreground">
              {customer.email
                ? 'Walk-in customer without an online account. They can activate one from the sign-up page ("Already a Relux Laundry customer?") with this email.'
                : 'Walk-in customer without an online account. The activation code is sent by email, so add an email address before they can activate online.'}
            </p>
          )}
          {customer.portalStatus === 'NOT_ELIGIBLE' && (
            <p className="text-xs text-muted-foreground">
              No online account, and no walk-in history with contact details to activate one with. Still counted as a customer.
            </p>
          )}
          {customer.needsReview && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Flagged for review{customer.reviewReason ? `: ${customer.reviewReason}` : ''}.
            </p>
          )}

          {customer.isActive === false && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1.5 text-sm">
              <p>
                <span className="text-muted-foreground">Deactivated: </span>
                {customer.deactivatedAt ? format(new Date(customer.deactivatedAt), 'PPP p') : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">By: </span>
                {customer.deactivatedBy?.name || '—'}
              </p>
              <p className="break-words">
                <span className="text-muted-foreground">Reason: </span>
                {customer.deactivationReason || 'No reason given'}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Orders, payments, wallet and loyalty history are unchanged.
              </p>
            </div>
          )}

          {customer.isActive !== false && customer.reactivatedAt && (
            <p className="text-xs text-muted-foreground">
              Reactivated {format(new Date(customer.reactivatedAt), 'PPP p')}
              {customer.reactivatedBy?.name ? ` by ${customer.reactivatedBy.name}` : ''}
            </p>
          )}

          <InfoRow
            icon={Calendar}
            label="Joined"
            value={customer.createdAt ? format(new Date(customer.createdAt), 'PPP') : null}
          />
        </div>

        <Separator />

        {/* Loyalty */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Loyalty
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3">
              <Award className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <p className="text-sm font-medium">{tier?.name || 'None'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Points Balance</p>
              <p className="text-sm font-bold">{loyaltyPoints.toLocaleString()} pts</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Wallet */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            Wallet
          </p>
          <div className="flex items-start gap-3">
            <Wallet className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              {walletLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mt-1" />
              ) : walletBalance !== null ? (
                <p className="text-sm font-bold">₦{walletBalance.toLocaleString()}</p>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Orders */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Orders{ordersTotal ? ` (${ordersTotal})` : ''}
          </p>
          {!customerId ? (
            <p className="text-sm text-muted-foreground">No customer record linked.</p>
          ) : orders === null ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="rounded-lg border divide-y">
              {orders.map((o) => (
                <button
                  key={o._id}
                  type="button"
                  onClick={() => showOrder(o)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{garmentLine(o)}</span>
                    <span className="text-xs font-medium">{naira(o.pricing?.total ?? o.total ?? 0)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {o.createdAt ? format(new Date(o.createdAt), 'PP') : ''}
                    {o.orderSource === 'offline' ? ' · Walk-in' : ' · Online'}
                  </p>
                </button>
              ))}
            </div>
          )}
          {ordersTotal > (orders?.length ?? 0) && (
            <p className="text-xs text-muted-foreground">Showing the latest {orders?.length} of {ordersTotal}.</p>
          )}
        </div>
      </div>

      <StaffOrderDetailModal
        order={openOrder}
        open={!!openOrder}
        onOpenChange={(v) => !v && setOpenOrder(null)}
      />
    </ModalForm>
  );
}
