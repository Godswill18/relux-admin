// ============================================================================
// REFERRAL SETTINGS TAB - Configure Referral Program Settings
// ============================================================================

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReferralStore } from '@/stores/useReferralStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// SCHEMA
// ============================================================================

const settingsSchema = z.object({
  enabled: z.boolean(),
  referrerRewardAmount: z.coerce.number().min(0),
  refereeRewardAmount: z.coerce.number().min(0),
  referrerLoyaltyPoints: z.coerce.number().min(0),
  refereeLoyaltyPoints: z.coerce.number().min(0),
  minOrderCount: z.coerce.number().min(1),
  minOrderAmount: z.coerce.number().min(0),
  qualifyOnStatus: z.enum(['paid', 'completed']),
  maxRewardsPerReferrer: z.coerce.number().min(0).optional(),
  allowSelfReferral: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function ReferralSettingsTab() {
  const { settings, isLoadingSettings, updateSettings } = useReferralStore();

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: true,
      referrerRewardAmount: 1000,
      refereeRewardAmount: 0,
      referrerLoyaltyPoints: 0,
      refereeLoyaltyPoints: 0,
      minOrderCount: 1,
      minOrderAmount: 0,
      qualifyOnStatus: 'completed',
      maxRewardsPerReferrer: 0,
      allowSelfReferral: false,
    },
  });

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        enabled: settings.enabled ?? true,
        referrerRewardAmount: settings.referrerRewardAmount ?? 1000,
        refereeRewardAmount: settings.refereeRewardAmount ?? 0,
        referrerLoyaltyPoints: settings.referrerLoyaltyPoints ?? 0,
        refereeLoyaltyPoints: settings.refereeLoyaltyPoints ?? 0,
        minOrderCount: settings.minOrderCount ?? 1,
        minOrderAmount: settings.minOrderAmount ?? 0,
        qualifyOnStatus: settings.qualifyOnStatus ?? 'completed',
        maxRewardsPerReferrer: settings.maxRewardsPerReferrer ?? 0,
        allowSelfReferral: settings.allowSelfReferral ?? false,
      });
    }
  }, [settings, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: SettingsForm) => {
    try {
      await updateSettings(data);
      toast.success('Referral settings updated successfully');
    } catch {
      toast.error('Failed to update referral settings');
    }
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Program Settings</CardTitle>
        <CardDescription>Configure how the referral program works</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Program Toggle */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Referral Program</FormLabel>
                    <FormDescription>
                      When disabled, customers cannot apply referral codes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Reward Amounts */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Wallet Rewards</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referrerRewardAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referrer Reward (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1000" {...field} />
                      </FormControl>
                      <FormDescription>Wallet credit for the person who refers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refereeRewardAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referee Reward (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Wallet credit for the referred customer</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Loyalty Points */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Loyalty Points Rewards</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referrerLoyaltyPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referrer Points</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Loyalty points for the referrer</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refereeLoyaltyPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referee Points</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Loyalty points for the referee</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Qualification Rules */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Qualification Rules</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="qualifyOnStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualify On</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Order Paid</SelectItem>
                          <SelectItem value="completed">Order Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>When the referral qualifies for reward</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minOrderCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Orders</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription>Orders needed to qualify</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minOrderAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Order Amount (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Minimum order value</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Limits</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxRewardsPerReferrer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Rewards Per Referrer</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0 = unlimited" {...field} />
                      </FormControl>
                      <FormDescription>0 means unlimited</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allowSelfReferral"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Allow Self-Referral</FormLabel>
                        <FormDescription>Allow users to refer themselves</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
