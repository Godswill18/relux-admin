// ============================================================================
// OFFLINE ORDER MODAL - Staff creates a walk-in order without a customer account
// ============================================================================

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api/client';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_TYPES = [
  { value: 'wash-fold',  label: 'Wash & Fold' },
  { value: 'wash-iron',  label: 'Wash & Iron' },
  { value: 'iron-only',  label: 'Iron Only' },
  { value: 'dry-clean',  label: 'Dry Clean' },
] as const;

// ============================================================================
// SCHEMA
// ============================================================================

const itemSchema = z.object({
  itemType:    z.string().min(1, 'Item name is required'),
  serviceType: z.string().min(1, 'Service type is required'),
  quantity:    z.coerce.number().int().positive('Must be at least 1'),
  unitPrice:   z.coerce.number().min(0, 'Price must be 0 or more'),
});

const offlineOrderSchema = z.object({
  customerName:        z.string().min(2, 'Name must be at least 2 characters'),
  customerPhone:       z.string().min(10, 'Enter a valid phone number'),
  items:               z.array(itemSchema).min(1, 'Add at least one item'),
  paymentMethod:       z.enum(['cash', 'pos', 'transfer']),
  specialInstructions: z.string().optional(),
});

type OfflineOrderForm = z.infer<typeof offlineOrderSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface OfflineOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OfflineOrderModal({ open, onOpenChange, onSuccess }: OfflineOrderModalProps) {
  const form = useForm<OfflineOrderForm>({
    resolver: zodResolver(offlineOrderSchema),
    defaultValues: {
      customerName:        '',
      customerPhone:       '',
      items:               [{ itemType: '', serviceType: 'wash-fold', quantity: 1, unitPrice: 0 }],
      paymentMethod:       'cash',
      specialInstructions: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (data: OfflineOrderForm) => {
    try {
      const orderItems = data.items.map((item) => ({
        itemType:    item.itemType,
        serviceType: item.serviceType,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        total:       item.quantity * item.unitPrice,
      }));

      // Derive the order-level serviceType from the most common item service
      // (backend also stores it on each item now, but the field is still present on the order)
      const primaryService = data.items[0].serviceType;

      await apiClient.post('/orders', {
        orderType:    'walk-in',
        walkInCustomer: {
          name:  data.customerName,
          phone: data.customerPhone,
        },
        serviceType: primaryService,
        items:       orderItems,
        paymentMethod: data.paymentMethod,
        specialInstructions: data.specialInstructions || undefined,
        pricing: {
          subtotal,
          total:       subtotal,
          pickupFee:   0,
          deliveryFee: 0,
          addOnsFee:   0,
          discount:    0,
          tax:         0,
        },
      });

      toast.success('Walk-in order created successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create order');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Walk-in Order</DialogTitle>
          <DialogDescription>
            Create an order for a customer who is physically present.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Customer ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Customer
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
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
              </div>
            </div>

            <Separator />

            {/* ── Items ────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Items
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ itemType: '', serviceType: 'wash-fold', quantity: 1, unitPrice: 0 })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Item
                </Button>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_160px_64px_100px_36px] gap-2 px-1">
                <span className="text-xs text-muted-foreground font-medium">Item</span>
                <span className="text-xs text-muted-foreground font-medium">Service</span>
                <span className="text-xs text-muted-foreground font-medium">Qty</span>
                <span className="text-xs text-muted-foreground font-medium">Price (₦)</span>
                <span />
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_160px_64px_100px_36px] gap-2 items-start">
                  {/* Item name */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.itemType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. Shirt, Trousers" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Per-item service type */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.serviceType`}
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Service" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit price */}
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => fields.length > 1 && remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Subtotal */}
              <div className="flex justify-end pt-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">Subtotal: </span>
                  <span className="font-bold">₦{subtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Payment & Notes ───────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Payment & Notes
              </p>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="pos">POS</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special care instructions..."
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
