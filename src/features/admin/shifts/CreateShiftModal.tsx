// ============================================================================
// CREATE SHIFT MODAL - Schedule Staff Work Shifts
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useShiftStore } from '@/stores/useShiftStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createShiftSchema = z
  .object({
    userId:    z.string().min(1, 'Staff member is required'),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endDate:   z.string().min(1, 'End date is required'),
    endTime:   z.string().min(1, 'End time is required'),
    shiftType: z.enum(['morning', 'afternoon', 'evening', 'night', 'full-day', 'custom']),
    notes:     z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

type CreateShiftForm = z.infer<typeof createShiftSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShiftModal({ open, onOpenChange }: CreateShiftModalProps) {
  const { createShift } = useShiftStore();
  const { staff, fetchStaff } = useStaffStore();

  useEffect(() => {
    if (open) fetchStaff();
  }, [open, fetchStaff]);

  const form = useForm<CreateShiftForm>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      userId:    '',
      startDate: '',
      startTime: '09:00',
      endDate:   '',
      endTime:   '17:00',
      shiftType: 'custom',
      notes:     '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // When startDate changes, default endDate to the same day
  const watchStartDate = form.watch('startDate');

  const onSubmit = async (data: CreateShiftForm) => {
    try {
      await createShift({
        userId:    data.userId,
        startDate: data.startDate,   // "YYYY-MM-DD" — matches model field
        startTime: data.startTime,   // "HH:MM"
        endDate:   data.endDate,     // "YYYY-MM-DD"
        endTime:   data.endTime,     // "HH:MM"
        shiftType: data.shiftType,
        notes:     data.notes || undefined,
      } as any);

      toast.success('Shift created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create shift');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Shift"
      description="Schedule a new work shift for a staff member"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Staff member */}
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Array.isArray(staff) ? staff : []).map((s: any) => (
                      <SelectItem key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Shift type */}
          <FormField
            control={form.control}
            name="shiftType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shift Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="full-day">Full Day</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // Auto-set endDate if not already set
                        const current = form.getValues('endDate');
                        if (!current) form.setValue('endDate', e.target.value);
                      }}
                    />
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
                    <Input type="date" min={watchStartDate} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time *</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes..."
                    className="resize-none"
                    rows={2}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Shift
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
