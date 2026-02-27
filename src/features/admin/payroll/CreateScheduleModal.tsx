// ============================================================================
// CREATE SCHEDULE MODAL - Create New Payroll Schedule
// ============================================================================

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, addWeeks, endOfMonth, startOfMonth, format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePayrollStore, PayrollFrequency } from '@/stores/usePayrollStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createScheduleSchema = z
  .object({
    name: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    frequency: z.enum(['weekly', 'biweekly', 'monthly', 'custom']),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type CreateScheduleForm = z.infer<typeof createScheduleSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateScheduleModal({ open, onOpenChange }: CreateScheduleModalProps) {
  const { createPeriod } = usePayrollStore();
  const { staff: staffList, fetchStaff } = useStaffStore();
  const [staffFetched, setStaffFetched] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);

  // Fetch staff when modal opens
  useEffect(() => {
    if (open && !staffFetched && staffList.length === 0) {
      fetchStaff().then(() => setStaffFetched(true));
    }
  }, [open, staffFetched, staffList.length, fetchStaff]);

  const form = useForm<CreateScheduleForm>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      frequency: 'monthly',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const frequency = form.watch('frequency');

  // Auto-set date range when frequency changes
  const handleFrequencyChange = (value: PayrollFrequency) => {
    form.setValue('frequency', value);

    const today = new Date();
    let start: Date;
    let end: Date;

    switch (value) {
      case 'weekly':
        start = today;
        end = addDays(today, 6);
        break;
      case 'biweekly':
        start = today;
        end = addDays(today, 13);
        break;
      case 'monthly':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      default:
        return; // custom — let user pick
    }

    form.setValue('startDate', format(start, 'yyyy-MM-dd'));
    form.setValue('endDate', format(end, 'yyyy-MM-dd'));
  };

  const toggleStaff = (staffId: string) => {
    setSelectAll(false);
    setSelectedStaff((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedStaff([]);
    }
  };

  const activeStaff = staffList.filter((s: any) => s.isActive !== false);

  const onSubmit = async (data: CreateScheduleForm) => {
    try {
      await createPeriod({
        name: data.name || undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        frequency: data.frequency as PayrollFrequency,
        staffIds: selectAll ? [] : selectedStaff, // empty = all staff
      });
      toast.success('Payroll schedule created');
      form.reset();
      setSelectedStaff([]);
      setSelectAll(true);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create payroll schedule');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Payroll Schedule"
      description="Define a payroll cycle with date range, frequency, and staff selection"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name (optional) */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. January 2026 Payroll" {...field} />
                </FormControl>
                <FormDescription>Optional. Auto-generated if left empty.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Frequency */}
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency *</FormLabel>
                <Select value={field.value} onValueChange={handleFrequencyChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Staff Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Selection
              </FormLabel>
              {!selectAll && selectedStaff.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedStaff.length} selected
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={(checked) => handleSelectAll(!!checked)}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Include all active staff
              </label>
            </div>

            {!selectAll && (
              <ScrollArea className="h-40 rounded-md border p-3">
                <div className="space-y-2">
                  {activeStaff.length > 0 ? (
                    activeStaff.map((s: any) => {
                      const sId = s._id || s.id;
                      return (
                        <div key={sId} className="flex items-center space-x-2">
                          <Checkbox
                            id={`staff-${sId}`}
                            checked={selectedStaff.includes(sId)}
                            onCheckedChange={() => toggleStaff(sId)}
                          />
                          <label
                            htmlFor={`staff-${sId}`}
                            className="text-sm leading-none cursor-pointer flex-1"
                          >
                            {s.name}
                            {s.staffRole && (
                              <span className="text-muted-foreground ml-1 capitalize">
                                ({s.staffRole})
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No active staff found</p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

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
            <Button type="submit" disabled={isSubmitting || (!selectAll && selectedStaff.length === 0)}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Schedule
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
