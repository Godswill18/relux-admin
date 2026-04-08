// ============================================================================
// PAYMENT SETTINGS TAB - Payment Configuration
// ============================================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { PaymentMethod } from '@/types';
import { toast } from 'sonner';
import {
  Save, CreditCard, Wallet, DollarSign, Smartphone,
  Eye, EyeOff, CheckCircle2,
} from 'lucide-react';

// ─── Secret key input with eye toggle + "saved" indicator ─────────────────

function SecretKeyInput({
  id,
  placeholder,
  value,
  onChange,
  isAlreadySaved,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  isAlreadySaved: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={isAlreadySaved ? 'Leave blank to keep saved key' : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {isAlreadySaved && !value && (
        <p className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Key saved — leave blank to keep it
        </p>
      )}
    </div>
  );
}

// ============================================================================
// PAYMENT SETTINGS TAB COMPONENT
// ============================================================================

export function PaymentSettingsTab() {
  const { settings, secretKeyFlags, updateSettings } = usePaymentStore();

  const [localSettings, setLocalSettings]   = useState(settings);
  const [isSaving, setIsSaving]             = useState(false);

  // Sync local state whenever the store settings are loaded/changed
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const set = (patch: Partial<typeof localSettings>) =>
    setLocalSettings((prev) => ({ ...prev, ...patch }));

  const handleToggleMethod = (method: PaymentMethod) => {
    const current = Array.isArray(localSettings.enabledMethods) ? localSettings.enabledMethods : [];
    const enabledMethods = current.includes(method)
      ? current.filter((m) => m !== method)
      : [...current, method];
    set({ enabledMethods });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(localSettings);
      toast.success('Payment settings saved');
      // Clear secret key fields from local state after save (they were applied)
      setLocalSettings((prev) => ({
        ...prev,
        paystackSecretKey:    '',
        flutterwaveSecretKey: '',
      }));
    } catch {
      toast.error('Failed to save payment settings');
    } finally {
      setIsSaving(false);
    }
  };

  const paymentMethods = [
    { method: PaymentMethod.CASH,     label: 'Cash',          icon: <DollarSign className="h-4 w-4" /> },
    { method: PaymentMethod.PAYSTACK, label: 'Paystack',      icon: <CreditCard className="h-4 w-4" /> },
    { method: PaymentMethod.TRANSFER, label: 'Bank Transfer', icon: <Wallet className="h-4 w-4" /> },
    { method: PaymentMethod.LENCO,    label: 'Lenco',         icon: <Wallet className="h-4 w-4" /> },
    { method: PaymentMethod.WALLET,   label: 'Wallet',        icon: <Wallet className="h-4 w-4" /> },
    { method: PaymentMethod.POS,      label: 'POS',           icon: <Smartphone className="h-4 w-4" /> },
  ];

  const enabledMethods = Array.isArray(localSettings.enabledMethods) ? localSettings.enabledMethods : [];

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Enable or disable payment methods for customers
          </p>
        </div>
        <Separator />
        <div className="space-y-4">
          {paymentMethods.map(({ method, label, icon }) => (
            <div key={method} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {icon}
                <Label htmlFor={`method-${method}`} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
              </div>
              <Switch
                id={`method-${method}`}
                checked={enabledMethods.includes(method)}
                onCheckedChange={() => handleToggleMethod(method)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Paystack Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-medium">Paystack Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Keys saved here are used for all Paystack API calls and webhook verification
            </p>
          </div>
          {secretKeyFlags.paystackSecretKeySet && (
            <Badge variant="secondary" className="ml-auto shrink-0 text-green-700 bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paystackPublicKey">Public Key</Label>
            <Input
              id="paystackPublicKey"
              type="text"
              placeholder="pk_live_... or pk_test_..."
              value={localSettings.paystackPublicKey || ''}
              onChange={(e) => set({ paystackPublicKey: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paystackSecretKey">Secret Key</Label>
            <SecretKeyInput
              id="paystackSecretKey"
              placeholder="sk_live_... or sk_test_..."
              value={localSettings.paystackSecretKey || ''}
              onChange={(v) => set({ paystackSecretKey: v })}
              isAlreadySaved={secretKeyFlags.paystackSecretKeySet}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Lenco Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-medium">Lenco Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure Lenco payment gateway
            </p>
          </div>
          {secretKeyFlags.lencoSecretKeySet && (
            <Badge variant="secondary" className="ml-auto shrink-0 text-green-700 bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lencoApiKey">API Key</Label>
            <SecretKeyInput
              id="lencoApiKey"
              placeholder="lenco_api_..."
              value={localSettings.lencoApiKey || ''}
              onChange={(v) => set({ lencoApiKey: v })}
              isAlreadySaved={secretKeyFlags.lencoSecretKeySet}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Flutterwave Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-lg font-medium">Flutterwave Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure Flutterwave payment gateway
            </p>
          </div>
          {secretKeyFlags.flutterwaveSecretKeySet && (
            <Badge variant="secondary" className="ml-auto shrink-0 text-green-700 bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          )}
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="flutterwavePublicKey">Public Key</Label>
            <Input
              id="flutterwavePublicKey"
              type="text"
              placeholder="FLWPUBK_TEST-... or FLWPUBK-..."
              value={localSettings.flutterwavePublicKey || ''}
              onChange={(e) => set({ flutterwavePublicKey: e.target.value })}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flutterwaveSecretKey">Secret Key</Label>
            <SecretKeyInput
              id="flutterwaveSecretKey"
              placeholder="FLWSECK_TEST-... or FLWSECK-..."
              value={localSettings.flutterwaveSecretKey || ''}
              onChange={(v) => set({ flutterwaveSecretKey: v })}
              isAlreadySaved={secretKeyFlags.flutterwaveSecretKeySet}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
