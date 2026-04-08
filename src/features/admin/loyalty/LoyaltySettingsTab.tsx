// ============================================================================
// LOYALTY SETTINGS TAB - Loyalty Program Configuration
// ============================================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { toast } from 'sonner';
import { Save, Coins, Wallet, RefreshCw } from 'lucide-react';

export function LoyaltySettingsTab() {
  const { settings, updateSettings, fetchSettings } = useLoyaltyStore();
  const [local, setLocal] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Keep local in sync when settings load from backend
  useEffect(() => { setLocal(settings); }, [settings]);

  const set = (patch: Partial<typeof local>) => setLocal((s) => ({ ...s, ...patch }));

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(local);
      toast.success('Loyalty settings saved');
    } catch {
      toast.error('Failed to save loyalty settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview: how much wallet credit per N points
  const previewWallet = local.walletConversionRate > 0
    ? `${local.walletConversionRate} pts = ₦1 (${local.minConvertPoints} pts minimum)`
    : '—';

  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Program Status ── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Program Status</h3>
          <p className="text-sm text-muted-foreground">Enable or disable the entire loyalty program</p>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enable Loyalty Program</Label>
          <Switch id="enabled" checked={local.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </section>

      <Separator />

      {/* ── Points Earning ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <div>
            <h3 className="text-base font-semibold">Points Earning</h3>
            <p className="text-sm text-muted-foreground">How customers earn points from orders</p>
          </div>
        </div>
        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pointsPerCurrency">Points per ₦1 spent</Label>
            <Input
              id="pointsPerCurrency"
              type="number"
              min="0"
              step="0.1"
              value={local.pointsPerCurrency}
              onChange={(e) => set({ pointsPerCurrency: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">Points awarded per ₦1 on completed/delivered orders</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxPointsPerOrder">Max points per order (optional)</Label>
            <Input
              id="maxPointsPerOrder"
              type="number"
              min="0"
              value={local.maxPointsPerOrder ?? ''}
              placeholder="No limit"
              onChange={(e) => set({ maxPointsPerOrder: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="text-xs text-muted-foreground">Leave blank for no cap</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bonusFirstOrder">First order bonus (pts)</Label>
            <Input
              id="bonusFirstOrder"
              type="number"
              min="0"
              value={local.bonusFirstOrderPoints}
              onChange={(e) => set({ bonusFirstOrderPoints: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bonusSecondOrder">Second order bonus (pts)</Label>
            <Input
              id="bonusSecondOrder"
              type="number"
              min="0"
              value={local.bonusSecondOrderPoints}
              onChange={(e) => set({ bonusSecondOrderPoints: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekend Multiplier</Label>
              <p className="text-xs text-muted-foreground">Bonus points on weekend orders</p>
            </div>
            <Switch
              checked={local.weekendMultiplierEnabled}
              onCheckedChange={(v) => set({ weekendMultiplierEnabled: v })}
            />
          </div>
          {local.weekendMultiplierEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="weekendMult">Weekend multiplier %</Label>
              <Input
                id="weekendMult"
                type="number"
                min="100"
                value={local.weekendMultiplierPercent}
                onChange={(e) => set({ weekendMultiplierPercent: parseInt(e.target.value) || 200 })}
              />
              <p className="text-xs text-muted-foreground">200 = 2× points on weekends</p>
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* ── Wallet Conversion ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <div>
            <h3 className="text-base font-semibold">Wallet Conversion</h3>
            <p className="text-sm text-muted-foreground">
              Let customers convert accumulated points into real wallet money
            </p>
          </div>
        </div>
        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Points-to-Wallet Conversion</Label>
            <p className="text-xs text-muted-foreground">
              Customers can convert their points balance to wallet credit
            </p>
          </div>
          <Switch
            checked={local.walletConversionEnabled}
            onCheckedChange={(v) => set({ walletConversionEnabled: v })}
          />
        </div>

        {local.walletConversionEnabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="conversionRate">Conversion rate (pts per ₦1)</Label>
              <Input
                id="conversionRate"
                type="number"
                min="1"
                value={local.walletConversionRate}
                onChange={(e) => set({ walletConversionRate: parseInt(e.target.value) || 100 })}
              />
              <p className="text-xs text-muted-foreground">
                e.g. 100 → 100 pts = ₦1
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minConvert">Minimum points to convert</Label>
              <Input
                id="minConvert"
                type="number"
                min="1"
                value={local.minConvertPoints}
                onChange={(e) => set({ minConvertPoints: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
        )}

        {local.walletConversionEnabled && (
          <p className="text-xs bg-muted/60 rounded p-2 text-muted-foreground">
            Preview: <strong>{previewWallet}</strong>
          </p>
        )}
      </section>

      <Separator />

      {/* ── Redemption (order discounts) ── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Order Redemption</h3>
          <p className="text-sm text-muted-foreground">Allow points to be used as order discounts</p>
        </div>
        <Separator />

        <div className="flex items-center justify-between">
          <Label>Enable Order Redemption</Label>
          <Switch
            checked={local.redemptionEnabled}
            onCheckedChange={(v) => set({ redemptionEnabled: v })}
          />
        </div>

        {local.redemptionEnabled && (
          <div className="space-y-1.5">
            <Label htmlFor="minRedeem">Minimum points for redemption</Label>
            <Input
              id="minRedeem"
              type="number"
              min="0"
              value={local.minRedeemPoints}
              onChange={(e) => set({ minRedeemPoints: parseInt(e.target.value) || 0 })}
            />
          </div>
        )}
      </section>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => fetchSettings()} disabled={isSaving}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
