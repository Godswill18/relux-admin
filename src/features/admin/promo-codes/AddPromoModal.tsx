// ============================================================================
// ADD PROMO MODAL - Create Promo Code Form
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePromoStore } from '@/stores/usePromoStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const addPromoSchema = z.object({
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .transform((v) => v.toUpperCase().trim()),
  type: z.enum(['fixed', 'percent'], { required_error: 'Select a discount type' }),
  value: z.coerce.number().min(1, 'Value must be at least 1'),
  usageLimit: z.coerce.number().min(1).optional(),
  usagePerUser: z.coerce.number().min(1).default(1),
  expiresAt: z.string().optional(),
});

type AddPromoForm = z.infer<typeof addPromoSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface AddPromoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPromoModal({ open, onOpenChange }: AddPromoModalProps) {
  const { createPromoCode } = usePromoStore();

  const form = useForm<AddPromoForm>({
    resolver: zodResolver(addPromoSchema),
    defaultValues: {
      code: '',
      type: 'percent',
      value: 10,
      usageLimit: undefined,
      usagePerUser: 1,
      expiresAt: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const selectedType = form.watch('type');

  const onSubmit = async (data: AddPromoForm) => {
    try {
      const payload: Record<string, unknown> = {
        code: data.code,
        type: data.type,
        value: data.value,
      };
      if (data.usageLimit && data.usageLimit > 0) payload.usageLimit = data.usageLimit;
      payload.usagePerUser = data.usagePerUser ?? 1;
      if (data.expiresAt) payload.expiresAt = data.expiresAt;

      await createPromoCode(payload as any);
      toast.success('Promo code created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create promo code');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Promo Code"
      description="Create a new promotional discount code for customers"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. WELCOME20, SUMMER50"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === 'percent' ? 'Discount (%)' : 'Discount (₦)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={selectedType === 'percent' ? 100 : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="usageLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Usage Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usagePerUser"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uses Per Customer</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date (optional)</FormLabel>
                <FormControl>
                  <Input type="date" min={new Date().toISOString().split('T')[0]} {...field} />
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Code
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
