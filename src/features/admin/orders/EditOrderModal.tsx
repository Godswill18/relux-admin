// ============================================================================
// EDIT ORDER MODAL - Update order status / notes / payment status
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrderStore } from '@/stores/useOrderStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const ORDER_STATUSES = [
  { value: 'pending',          label: 'Pending' },
  { value: 'confirmed',        label: 'Confirmed' },
  { value: 'picked-up',        label: 'Picked Up' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'washing',          label: 'Washing' },
  { value: 'ironing',          label: 'Ironing' },
  { value: 'ready',            label: 'Ready' },
  { value: 'out-for-delivery', label: 'Out for Delivery' },
  { value: 'delivered',        label: 'Delivered' },
  { value: 'completed',        label: 'Completed' },
  { value: 'cancelled',        label: 'Cancelled' },
] as const;

const PAYMENT_STATUSES = [
  { value: 'unpaid',   label: 'Unpaid' },
  { value: 'paid',     label: 'Paid' },
  { value: 'partial',  label: 'Partial' },
  { value: 'refunded', label: 'Refunded' },
] as const;

// Orders in these statuses cannot be edited via PUT — only status can change
const LOCKED_STATUSES = ['completed', 'delivered', 'cancelled'];

// ============================================================================
// SCHEMA
// ============================================================================

const schema = z.object({
  status:              z.string().min(1),
  paymentStatus:       z.string().min(1),
  notes:               z.string().optional(),
  specialInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
}

export function EditOrderModal({ open, onOpenChange, order }: EditOrderModalProps) {
  const { updateOrder, updateOrderStatus } = useOrderStore();

  const isLocked = LOCKED_STATUSES.includes(order?.status);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status:              '',
      paymentStatus:       '',
      notes:               '',
      specialInstructions: '',
    },
  });

  useEffect(() => {
    if (order) {
      form.reset({
        status:              order.status || 'pending',
        paymentStatus:       order.paymentStatus || 'unpaid',
        notes:               order.notes || '',
        specialInstructions: order.specialInstructions || '',
      });
    }
  }, [order, form]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: FormValues) => {
    if (!order) return;
    const orderId = order._id || order.id;
    const originalStatus = order.status;
    const statusChanged = data.status !== originalStatus;

    try {
      if (isLocked) {
        // Locked orders: only allow status change via PATCH endpoint
        if (statusChanged) {
          await updateOrderStatus(orderId, data.status as any);
        }
      } else {
        // Active orders: update editable fields via PUT, status via PATCH
        const fieldsPayload: Record<string, any> = {
          paymentStatus:       data.paymentStatus,
          notes:               data.notes,
          specialInstructions: data.specialInstructions,
        };
        await updateOrder(orderId, fieldsPayload);

        if (statusChanged) {
          await updateOrderStatus(orderId, data.status as any);
        }
      }

      toast.success('Order updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update order';
      toast.error(msg);
    }
  };

  const customerName = order?.customer?.name || order?.walkInCustomer?.name || '—';

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Order"
      description={`Order ${order?.orderNumber || ''} — ${customerName}`}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {isLocked && (
            <p className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
              This order is <strong>{order?.status}</strong>. Only the status can be changed.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLocked}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="specialInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Instructions</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any special handling instructions…"
                    className="resize-none"
                    rows={2}
                    disabled={isLocked}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Internal notes (not visible to customer)…"
                    className="resize-none"
                    rows={2}
                    disabled={isLocked}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
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
