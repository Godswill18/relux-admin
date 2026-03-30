// ============================================================================
// VIEW CUSTOMER MODAL - Read-only customer details view
// ============================================================================

import { useEffect, useState } from 'react';
import { ModalForm } from '@/components/shared/ModalForm';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  const status = customerDoc?.status;

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Account Status</p>
              {status ? (
                <Badge
                  variant={
                    status === 'active' ? 'default' : status === 'suspended' ? 'destructive' : 'secondary'
                  }
                  className="mt-1 capitalize"
                >
                  {status}
                </Badge>
              ) : (
                <p className="text-sm font-medium">—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <Badge variant={customer.isActive !== false ? 'default' : 'secondary'} className="mt-1">
                {customer.isActive !== false ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
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
