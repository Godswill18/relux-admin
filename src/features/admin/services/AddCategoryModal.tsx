// ============================================================================
// ADD CATEGORY MODAL - Create New Service Category
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  basePrice: z.coerce.number().min(0, 'Price must be 0 or more'),
  unit: z.enum(['item', 'kg', 'bundle']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCategoryModal({ open, onOpenChange }: Props) {
  const { createCategory, services } = useServiceStore();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { serviceId: '', name: '', basePrice: 0, unit: 'item' },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: FormData) => {
    try {
      await createCategory(data);
      toast.success('Category created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create category');
    }
  };

  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title="Add Category" description="Create a new service category">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="serviceId" render={({ field }) => (
            <FormItem>
              <FormLabel>Service *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Array.isArray(services) ? services : []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name *</FormLabel>
              <FormControl><Input placeholder="e.g. Shirts" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="basePrice" render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (₦) *</FormLabel>
                <FormControl><Input type="number" min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
