// ============================================================================
// CREATE PERIOD MODAL - Create New Payroll Period
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
import { usePayrollStore } from '@/stores/usePayrollStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createPeriodSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

type CreatePeriodForm = z.infer<typeof createPeriodSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface CreatePeriodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePeriodModal({ open, onOpenChange }: CreatePeriodModalProps) {
  const { createPeriod } = usePayrollStore();

  const form = useForm<CreatePeriodForm>({
    resolver: zodResolver(createPeriodSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: CreatePeriodForm) => {
    try {
      await createPeriod({
        startDate: data.startDate,
        endDate: data.endDate,
      });
      toast.success('Payroll period created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create payroll period');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Payroll Period"
      description="Define a new payroll period date range"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
              Create Period
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
