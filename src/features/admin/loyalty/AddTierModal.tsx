// ============================================================================
// ADD TIER MODAL - Create New Loyalty Tier Form
// ============================================================================

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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useLoyaltyStore } from '@/stores/useLoyaltyStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const addTierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pointsRequired: z.coerce.number().min(0, 'Points must be 0 or more'),
  minSpend: z.coerce.number().min(0, 'Min spend must be 0 or more').default(0),
  multiplierPercent: z.coerce.number().min(100, 'Multiplier must be at least 100%').default(100),
  rank: z.coerce.number().min(1, 'Rank must be at least 1'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  freePickup: z.boolean().default(false),
  freeDelivery: z.boolean().default(false),
  priorityTurnaround: z.boolean().default(false),
});

type AddTierForm = z.infer<typeof addTierSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface AddTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTierModal({ open, onOpenChange }: AddTierModalProps) {
  const { createTier } = useLoyaltyStore();

  const form = useForm<AddTierForm>({
    resolver: zodResolver(addTierSchema),
    defaultValues: {
      name: '',
      pointsRequired: 0,
      minSpend: 0,
      multiplierPercent: 100,
      rank: 1,
      discountPercent: 0,
      freePickup: false,
      freeDelivery: false,
      priorityTurnaround: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: AddTierForm) => {
    try {
      await createTier(data);
      toast.success('Loyalty tier created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create loyalty tier');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Add Loyalty Tier"
      description="Create a new loyalty program tier"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tier Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Gold" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pointsRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Points *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minSpend"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Spend (₦) *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="multiplierPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Multiplier %</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rank *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="text-sm font-medium">Tier Benefits</div>

            <FormField
              control={form.control}
              name="discountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto Discount (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription>Automatically applied to every order at checkout (0 = no discount)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="freePickup"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Free Pickup</FormLabel>
                    <FormDescription>Waive pickup fees for this tier</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="freeDelivery"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Free Delivery</FormLabel>
                    <FormDescription>Waive delivery fees for this tier</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priorityTurnaround"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Priority Turnaround</FormLabel>
                    <FormDescription>Orders processed with priority</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Tier
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
