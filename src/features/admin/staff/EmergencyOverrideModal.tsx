// ============================================================================
// EMERGENCY OVERRIDE MODAL - Grant emergency access to staff
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const overrideSchema = z.object({
  reason: z.string().min(5, 'Please provide a reason (min 5 characters)'),
});

type OverrideForm = z.infer<typeof overrideSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface EmergencyOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  staffName: string;
}

export function EmergencyOverrideModal({
  open,
  onOpenChange,
  staffId,
  staffName,
}: EmergencyOverrideModalProps) {
  const form = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: { reason: '' },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: OverrideForm) => {
    try {
      await apiClient.post(`/staff/${staffId}/emergency-override`, {
        reason: data.reason,
      });

      toast.success(`Emergency access granted to ${staffName}`);
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to grant emergency override');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Emergency Override"
      description={`Grant emergency access to ${staffName} outside their scheduled shift`}
    >
      <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 mb-4">
        <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
        <div className="text-sm text-destructive">
          This action will be logged in the audit trail. The override grants temporary access
          for the duration you specify.
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Override *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Why does this staff member need emergency access?"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
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
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Grant Emergency Access
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
