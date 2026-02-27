// ============================================================================
// LOYALTY SETTINGS TAB - Loyalty Program Configuration
// ============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

// ============================================================================
// LOYALTY SETTINGS TAB COMPONENT
// ============================================================================

export function LoyaltySettingsTab() {
  const { settings, updateSettings } = useLoyaltyStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings(localSettings);
      toast.success('Loyalty settings updated successfully');
    } catch (error) {
      toast.error('Failed to update loyalty settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Program Status */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Program Status</h3>
          <p className="text-sm text-muted-foreground">
            Enable or disable the loyalty program
          </p>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled" className="text-sm font-medium">
            Enable Loyalty Program
          </Label>
          <Switch
            id="enabled"
            checked={localSettings.enabled}
            onCheckedChange={(checked) =>
              setLocalSettings({ ...localSettings, enabled: checked })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Points Rules */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Points Rules</h3>
          <p className="text-sm text-muted-foreground">
            Configure how customers earn loyalty points
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pointsPerNaira">Points per ₦1 Spent</Label>
            <Input
              id="pointsPerNaira"
              type="number"
              min="0"
              step="0.1"
              value={localSettings.pointsPerNaira}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  pointsPerNaira: parseFloat(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Number of loyalty points earned per naira spent
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bonus Points */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Bonus Points</h3>
          <p className="text-sm text-muted-foreground">
            Configure bonus points for special events
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="signupBonus">Signup Bonus</Label>
            <Input
              id="signupBonus"
              type="number"
              min="0"
              value={localSettings.signupBonus}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  signupBonus: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Points awarded when a customer signs up
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="referralBonus">Referral Bonus</Label>
            <Input
              id="referralBonus"
              type="number"
              min="0"
              value={localSettings.referralBonus}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  referralBonus: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Points awarded for successful referrals
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="birthdayBonus">Birthday Bonus</Label>
            <Input
              id="birthdayBonus"
              type="number"
              min="0"
              value={localSettings.birthdayBonus}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  birthdayBonus: parseInt(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Points awarded on customer's birthday
            </p>
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
