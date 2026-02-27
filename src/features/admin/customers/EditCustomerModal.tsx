// ============================================================================
// EDIT CUSTOMER MODAL - Edit customer profile fields
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
import { Button } from '@/components/ui/button';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// SCHEMA
// ============================================================================

const editCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

type EditCustomerForm = z.infer<typeof editCustomerSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface EditCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: any | null;
}

export function EditCustomerModal({ open, onOpenChange, customer }: EditCustomerModalProps) {
  const { updateCustomer } = useCustomerStore();

  const form = useForm<EditCustomerForm>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
    },
  });

  // Populate form when customer changes
  useEffect(() => {
    if (!customer) return;
    const customerDoc = customer.customerId;
    form.reset({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customerDoc?.address || '',
      city: customerDoc?.city || '',
    });
  }, [customer, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: EditCustomerForm) => {
    if (!customer) return;
    const customerDoc = customer.customerId;
    const customerId = customerDoc?._id || customerDoc?.id;
    if (!customerId) {
      toast.error('Cannot identify customer record');
      return;
    }
    try {
      await updateCustomer(customerId, {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
      });
      toast.success('Customer updated successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update customer');
    }
  };

  if (!customer) return null;

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Customer"
      description={`Editing profile for ${customer.name}`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="08012345678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Lagos" {...field} />
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
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
