// ============================================================================
// ADD / EDIT PLAN MODAL - Create or update a Subscription Plan
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSubscriptionStore, SubscriptionPlan } from '@/stores/useSubscriptionStore';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.coerce.number().min(1, 'Price must be at least 1'),
  durationDays: z.coerce.number().min(1, 'Duration must be at least 1 day').default(30),
  itemLimit: z.coerce.number().min(1, 'Item limit must be at least 1'),
});

type PlanForm = z.infer<typeof planSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface AddPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null; // when provided → edit mode
}

export function AddPlanModal({ open, onOpenChange, plan }: AddPlanModalProps) {
  const { createPlan, updatePlan } = useSubscriptionStore();
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');

  const isEditing = !!plan;

  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      durationDays: 30,
      itemLimit: 20,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        durationDays: plan.durationDays,
        itemLimit: plan.itemLimit,
      });
      setFeatures(plan.features || []);
    } else {
      form.reset({ name: '', description: '', price: 0, durationDays: 30, itemLimit: 20 });
      setFeatures([]);
    }
  }, [plan, form]);

  const isSubmitting = form.formState.isSubmitting;

  const addFeature = () => {
    const trimmed = featureInput.trim();
    if (trimmed && !features.includes(trimmed)) {
      setFeatures([...features, trimmed]);
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PlanForm) => {
    try {
      if (isEditing) {
        await updatePlan(plan._id || plan.id, { ...data, features });
        toast.success('Subscription plan updated successfully');
      } else {
        await createPlan({ ...data, features } as any);
        toast.success('Subscription plan created successfully');
      }
      form.reset();
      setFeatures([]);
      setFeatureInput('');
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Failed to update plan' : 'Failed to create plan');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
      description={
        isEditing
          ? 'Update this subscription plan'
          : 'Create a new subscription plan that customers can subscribe to'
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Basic, Family, Premium" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of the plan"
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="durationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (days)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Limit</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <FormLabel>Features</FormLabel>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Up to 20 items/month"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {features.map((feature, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {feature}
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Press Enter or click + to add. These appear on the customer subscription page.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              {isEditing ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
