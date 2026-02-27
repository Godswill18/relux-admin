// ============================================================================
// PAYMENT SETTINGS TAB - Payment Configuration
// ============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { usePaymentStore } from '@/stores/usePaymentStore';
import { PaymentMethod } from '@/types';
import { toast } from 'sonner';
import { Save, CreditCard, Wallet, DollarSign, Smartphone } from 'lucide-react';

// ============================================================================
// PAYMENT SETTINGS TAB COMPONENT
// ============================================================================

export function PaymentSettingsTab() {
  const { settings, updateSettings } = usePaymentStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Handle toggle payment method
  const handleToggleMethod = (method: PaymentMethod) => {
    const currentMethods = Array.isArray(localSettings.enabledMethods) ? localSettings.enabledMethods : [];
    const enabledMethods = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];

    setLocalSettings({ ...localSettings, enabledMethods });
  };

  // Handle save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(localSettings);
      toast.success('Payment settings updated successfully');
    } catch (error) {
      toast.error('Failed to update payment settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Payment method configuration
  const paymentMethods = [
    { method: PaymentMethod.CASH, label: 'Cash', icon: <DollarSign className="h-4 w-4" /> },
    { method: PaymentMethod.CARD, label: 'Card Payment', icon: <CreditCard className="h-4 w-4" /> },
    { method: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: <Wallet className="h-4 w-4" /> },
    { method: PaymentMethod.WALLET, label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { method: PaymentMethod.POS, label: 'POS', icon: <Smartphone className="h-4 w-4" /> },
  ];

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
                <Label htmlFor={method} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
              </div>
              <Switch
                id={method}
                checked={Array.isArray(localSettings.enabledMethods) ? localSettings.enabledMethods.includes(method) : false}
                onCheckedChange={() => handleToggleMethod(method)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Paystack Settings */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Paystack Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure Paystack payment gateway
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paystackPublicKey">Public Key</Label>
            <Input
              id="paystackPublicKey"
              type="text"
              placeholder="pk_test_..."
              value={localSettings.paystackPublicKey || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, paystackPublicKey: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paystackSecretKey">Secret Key</Label>
            <Input
              id="paystackSecretKey"
              type="password"
              placeholder="sk_test_..."
              value={localSettings.paystackSecretKey || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, paystackSecretKey: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Lenco Settings */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Lenco Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure Lenco payment gateway
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="lencoApiKey">API Key</Label>
            <Input
              id="lencoApiKey"
              type="password"
              placeholder="lenco_api_key_..."
              value={localSettings.lencoApiKey || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, lencoApiKey: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Flutterwave Settings */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Flutterwave Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure Flutterwave payment gateway
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="flutterwavePublicKey">Public Key</Label>
            <Input
              id="flutterwavePublicKey"
              type="text"
              placeholder="FLWPUBK_TEST-..."
              value={localSettings.flutterwavePublicKey || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, flutterwavePublicKey: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flutterwaveSecretKey">Secret Key</Label>
            <Input
              id="flutterwaveSecretKey"
              type="password"
              placeholder="FLWSECK_TEST-..."
              value={localSettings.flutterwaveSecretKey || ''}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, flutterwaveSecretKey: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
