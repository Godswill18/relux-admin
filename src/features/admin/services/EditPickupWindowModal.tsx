// ============================================================================
// EDIT PICKUP WINDOW MODAL
// ============================================================================

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModalForm } from '@/components/shared/ModalForm';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const schema = z.object({
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().min(1, 'Start time is required'),
  endTime:   z.string().min(1, 'End time is required'),
  baseFee:   z.coerce.number().min(0),
  rushFee:   z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupWindow: any;
}

export function EditPickupWindowModal({ open, onOpenChange, pickupWindow }: Props) {
  const { updatePickupWindow } = useServiceStore();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', baseFee: 0, rushFee: 0 },
  });

  useEffect(() => {
    if (open && pickupWindow) {
      form.reset({
        dayOfWeek: pickupWindow.dayOfWeek ?? 1,
        startTime: pickupWindow.startTime ?? '08:00',
        endTime:   pickupWindow.endTime   ?? '12:00',
        baseFee:   pickupWindow.baseFee   ?? 0,
        rushFee:   pickupWindow.rushFee   ?? 0,
      });
    }
  }, [open, pickupWindow]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: FormData) => {
    try {
      await updatePickupWindow(pickupWindow.id, data);
      toast.success('Pickup window updated successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update pickup window');
    }
  };

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title="Edit Pickup Window" description="Update the pickup time slot">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="dayOfWeek" render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Week *</FormLabel>
              <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="startTime" render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="endTime" render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="baseFee" render={({ field }) => (
              <FormItem>
                <FormLabel>Base Fee (₦)</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="rushFee" render={({ field }) => (
              <FormItem>
                <FormLabel>Rush Fee (₦)</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
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
