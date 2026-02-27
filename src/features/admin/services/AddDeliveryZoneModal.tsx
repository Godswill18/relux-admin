// ============================================================================
// ADD DELIVERY ZONE MODAL
// ============================================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ModalForm } from '@/components/shared/ModalForm';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  fee: z.coerce.number().min(0, 'Fee must be 0 or more'),
  rushFee: z.coerce.number().min(0),
  radiusKm: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDeliveryZoneModal({ open, onOpenChange }: Props) {
  const { createDeliveryZone } = useServiceStore();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', fee: 0, rushFee: 0, radiusKm: 0 },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: FormData) => {
    try {
      await createDeliveryZone(data);
      toast.success('Delivery zone created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create delivery zone');
    }
  };

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title="Add Delivery Zone" description="Create a new delivery area">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Zone Name *</FormLabel>
              <FormControl><Input placeholder="e.g. Lagos Island" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="fee" render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Fee (₦) *</FormLabel>
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

          <FormField control={form.control} name="radiusKm" render={({ field }) => (
            <FormItem>
              <FormLabel>Radius (km)</FormLabel>
              <FormControl><Input type="number" min={0} step={0.1} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Zone
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
