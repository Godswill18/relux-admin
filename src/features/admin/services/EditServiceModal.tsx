// ============================================================================
// EDIT SERVICE MODAL
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
}

export function EditServiceModal({ open, onOpenChange, service }: Props) {
  const { updateService } = useServiceStore();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (open && service) {
      form.reset({
        name:        service.name        ?? '',
        description: service.description ?? '',
      });
    }
  }, [open, service]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: FormData) => {
    try {
      await updateService(service.id, {
        name:        data.name,
        description: data.description || undefined,
      });
      toast.success('Service updated successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update service');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Service"
      description="Update the service details"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Service Name *</FormLabel>
              <FormControl><Input placeholder="e.g. Wash & Fold" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the service..." className="resize-none" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
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
