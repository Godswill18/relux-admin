// ============================================================================
// EDIT ENTRY MODAL - Edit Payroll Entry
// ============================================================================

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePayrollStore, PayrollEntry } from '@/stores/usePayrollStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const editEntrySchema = z.object({
  baseHours: z.coerce.number().min(0, 'Must be >= 0'),
  overtimeHours: z.coerce.number().min(0, 'Must be >= 0'),
  bonuses: z.coerce.number().min(0, 'Must be >= 0'),
  deductions: z.coerce.number().min(0, 'Must be >= 0'),
  totalPay: z.coerce.number().min(0, 'Must be >= 0'),
  notes: z.string().optional(),
});

type EditEntryForm = z.infer<typeof editEntrySchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface EditEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PayrollEntry | null;
}

export function EditEntryModal({ open, onOpenChange, entry }: EditEntryModalProps) {
  const { updateEntry } = usePayrollStore();

  const form = useForm<EditEntryForm>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      baseHours: 0,
      overtimeHours: 0,
      bonuses: 0,
      deductions: 0,
      totalPay: 0,
      notes: '',
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        baseHours: entry.baseHours || 0,
        overtimeHours: entry.overtimeHours || 0,
        bonuses: entry.bonuses || 0,
        deductions: entry.deductions || 0,
        totalPay: entry.totalPay || 0,
        notes: entry.notes || '',
      });
    }
  }, [entry, form]);

  // Auto-recalculate totalPay when components change
  const watchedFields = form.watch(['baseHours', 'overtimeHours', 'bonuses', 'deductions']);
  useEffect(() => {
    if (!entry) return;

    const [baseHours, overtimeHours, bonuses, deductions] = watchedFields;
    const hourlyRate = entry.hourlyRate || 0;
    const overtimeRate = entry.overtimeRate || 0;
    const payType = entry.payType;

    let basePay = 0;
    if (payType === 'hourly') {
      basePay = (baseHours || 0) * hourlyRate;
    } else {
      // monthly: basePay stays as the entry's basePay (salary)
      basePay = entry.basePay || 0;
    }

    const overtimePay = (overtimeHours || 0) * overtimeRate;
    const calculated = Math.round(basePay + overtimePay + (bonuses || 0) - (deductions || 0));

    form.setValue('totalPay', Math.max(0, calculated), { shouldValidate: true });
  }, [watchedFields, entry, form]);

  const isSubmitting = form.formState.isSubmitting;
  const staffName =
    entry && typeof entry.userId === 'object' ? entry.userId.name : 'Staff Member';
  const staffRole =
    entry && typeof entry.userId === 'object' ? entry.userId.staffRole : '';

  const onSubmit = async (data: EditEntryForm) => {
    if (!entry) return;

    try {
      await updateEntry(entry._id || entry.id, data);
      toast.success('Payroll entry updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update payroll entry');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Payroll Entry"
      description={`Adjust payroll for ${staffName}`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Staff info header */}
          {entry && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div>
                <div className="font-medium">{staffName}</div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {staffRole && <Badge variant="outline" className="text-xs capitalize">{staffRole}</Badge>}
                  <Badge variant="outline" className="text-xs capitalize">{entry.payType}</Badge>
                  {entry.payType === 'hourly' && entry.hourlyRate > 0 && (
                    <span>₦{entry.hourlyRate.toLocaleString()}/hr</span>
                  )}
                  {entry.payType === 'monthly' && entry.basePay > 0 && (
                    <span>₦{entry.basePay.toLocaleString()}/mo</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="baseHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="overtimeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overtime Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Bonuses & Deductions */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bonuses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonuses (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deductions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deductions (₦)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Total (auto-calculated) */}
          <FormField
            control={form.control}
            name="totalPay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Pay (₦)</FormLabel>
                <FormControl>
                  <Input type="number" className="text-lg font-bold" {...field} />
                </FormControl>
                <FormDescription>Auto-calculated. Override if needed.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional adjustment notes..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
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
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
