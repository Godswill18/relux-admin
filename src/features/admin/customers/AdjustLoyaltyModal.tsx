// ============================================================================
// ADJUST LOYALTY MODAL - Add or subtract loyalty points for a customer
// ============================================================================

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModalForm } from '@/components/shared/ModalForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { toast } from 'sonner';
import { Loader2, Award } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// SCHEMA
// ============================================================================

const adjustLoyaltySchema = z.object({
  points: z.coerce
    .number()
    .refine((v) => v !== 0, 'Points cannot be zero')
    .refine((v) => Number.isInteger(v), 'Points must be a whole number'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
});

type AdjustLoyaltyForm = z.infer<typeof adjustLoyaltySchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface AdjustLoyaltyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
}

export function AdjustLoyaltyModal({ open, onOpenChange, customer }: AdjustLoyaltyModalProps) {
  const { fetchCustomerLoyalty, adjustLoyaltyPoints } = useCustomerStore();

  const [loyaltyData, setLoyaltyData] = useState<{
    pointsBalance: number;
    tier: { name: string; rank: number } | null;
    recentLedger: any[];
  } | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const customerDoc = customer?.customerId;
  const customerId = customerDoc?._id || customerDoc?.id;

  const form = useForm<AdjustLoyaltyForm>({
    resolver: zodResolver(adjustLoyaltySchema),
    defaultValues: { points: 0, reason: '' },
  });

  useEffect(() => {
    if (!open) {
      setLoyaltyData(null);
      form.reset({ points: 0, reason: '' });
      return;
    }
    if (!customerId) return;
    setLoadingData(true);
    fetchCustomerLoyalty(customerId)
      .then((data) => setLoyaltyData(data))
      .catch(() => toast.error('Failed to load loyalty data'))
      .finally(() => setLoadingData(false));
  }, [open, customerId]);

  const onSubmit = async (data: AdjustLoyaltyForm) => {
    if (!customerId) return;
    try {
      await adjustLoyaltyPoints(customerId, data.points, data.reason);
      const action = data.points > 0 ? `Added ${data.points}` : `Removed ${Math.abs(data.points)}`;
      toast.success(`${action} loyalty points`);
      // Refresh loyalty data
      fetchCustomerLoyalty(customerId)
        .then((d) => setLoyaltyData(d))
        .catch(() => {});
      form.reset({ points: 0, reason: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to adjust loyalty points');
    }
  };

  if (!customer) return null;

  const currentPoints = loyaltyData?.pointsBalance ?? customerDoc?.loyaltyPointsBalance ?? 0;
  const currentTier = loyaltyData?.tier ?? customerDoc?.loyaltyTierId;
  const recentLedger = loyaltyData?.recentLedger ?? [];

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust Loyalty Points"
      description={`Manually adjust points for ${customer.name}`}
      className="max-w-md"
    >
      {/* Current status */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Tier</p>
            <p className="text-sm font-medium">{currentTier?.name || 'None'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          {loadingData ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <p className="text-xl font-bold">{currentPoints.toLocaleString()} pts</p>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Adjustment form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Points Adjustment</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 100 to add, -50 to remove"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Use a positive number to add points, negative to subtract.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Bonus reward, Correction..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || loadingData}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Form>

      {/* Recent ledger */}
      {recentLedger.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
              Recent Activity
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentLedger.map((entry: any, i) => (
                <div
                  key={entry._id || i}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <Badge
                      variant={entry.type === 'earn' || entry.type === 'adjust' ? 'default' : 'secondary'}
                      className="capitalize text-xs"
                    >
                      {entry.type}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>
                    {entry.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.createdAt), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-semibold text-sm ${entry.points >= 0 ? 'text-green-600' : 'text-destructive'}`}
                  >
                    {entry.points >= 0 ? '+' : ''}{entry.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ModalForm>
  );
}
