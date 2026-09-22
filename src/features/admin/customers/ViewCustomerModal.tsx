// ============================================================================
// VIEW CUSTOMER MODAL - Read-only customer details view
// ============================================================================

import { useEffect, useState } from 'react';
import { ModalForm } from '@/components/shared/ModalForm';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PortalStatusBadge } from '@/components/shared/StatusBadges';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { format } from 'date-fns';
import { Loader2, User, Phone, Mail, MapPin, Award, Wallet, Calendar } from 'lucide-react';

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
                ? 'This customer can activate an online account from the sign-up page using this email.'
                : 'No email on file — add one so this customer can activate an online account.'}
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
      </div>
    </ModalForm>
  );
}
