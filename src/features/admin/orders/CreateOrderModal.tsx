// ============================================================================
// CREATE ORDER MODAL - Admin Order Creation Form
// ============================================================================

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Separator } from '@/components/ui/separator';
import { useOrderStore } from '@/stores/useOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useServiceStore } from '@/stores/useServiceStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_TYPES = [
  { value: 'wash-fold', label: 'Wash & Fold' },
  { value: 'wash-iron', label: 'Wash & Iron' },
  { value: 'iron-only', label: 'Iron Only' },
  { value: 'dry-clean', label: 'Dry Clean' },
] as const;

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const orderItemSchema = z.object({
  itemType:    z.string().min(1, 'Item name required'),
  serviceType: z.string().min(1, 'Service type required'),
  quantity:    z.coerce.number().min(1, 'Min quantity is 1'),
  unitPrice:   z.coerce.number().min(0, 'Price must be 0 or more'),
  description: z.string().optional(),
});

const createOrderSchema = z.object({
  customerId:          z.string().min(1, 'Customer is required'),
  serviceLevel:        z.enum(['standard', 'express', 'premium']),
  orderType:           z.enum(['walk-in', 'pickup-delivery']),
  items:               z.array(orderItemSchema).min(1, 'At least one item is required'),
  pickupAddress: z.object({
    street: z.string().optional(),
    city:   z.string().optional(),
    state:  z.string().optional(),
  }).optional(),
  deliveryAddress: z.object({
    street: z.string().optional(),
    city:   z.string().optional(),
    state:  z.string().optional(),
  }).optional(),
  assignedStaff:       z.string().optional(),
  paymentMethod:       z.enum(['cash', 'wallet', 'pos', 'transfer']),
  specialInstructions: z.string().optional(),
  discount:            z.coerce.number().min(0).default(0),
});

type CreateOrderForm = z.infer<typeof createOrderSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrderModal({ open, onOpenChange }: CreateOrderModalProps) {
  const { createOrder } = useOrderStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { services, fetchServices } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchServices();
      fetchStaff();
    }
  }, [open, fetchCustomers, fetchServices, fetchStaff]);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId:          '',
      serviceLevel:        'standard',
      orderType:           'walk-in',
      items:               [{ itemType: '', serviceType: 'wash-fold', quantity: 1, unitPrice: 0, description: '' }],
      paymentMethod:       'cash',
      specialInstructions: '',
      discount:            0,
      assignedStaff:       '',
      pickupAddress:       { street: '', city: '', state: '' },
      deliveryAddress:     { street: '', city: '', state: '' },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const isSubmitting   = form.formState.isSubmitting;
  const watchItems     = form.watch('items');
  const watchOrderType = form.watch('orderType');
  const watchDiscount  = form.watch('discount') || 0;

  // Pricing
  const subtotal    = watchItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const pickupFee   = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const deliveryFee = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const taxable     = subtotal + pickupFee + deliveryFee - watchDiscount;
  const tax         = Math.round(taxable * 0.075);
  const total       = taxable + tax;

  // Filter customers by search
  const filteredCustomers = Array.isArray(customers)
    ? customers
        .filter((c) =>
          customerSearch
            ? c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
              c.phone?.includes(customerSearch)
            : true
        )
        .slice(0, 50)
    : [];

  const onSubmit = async (data: CreateOrderForm) => {
    try {
      // Derive order-level serviceType from the first item
      const primaryServiceType = data.items[0].serviceType;

      const orderPayload: any = {
        customerId:          data.customerId,
        serviceType:         primaryServiceType,
        serviceLevel:        data.serviceLevel,
        orderType:           data.orderType,
        items:               data.items.map((item) => ({
          itemType:    item.itemType,
          serviceType: item.serviceType,
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          total:       item.quantity * item.unitPrice,
          description: item.description || undefined,
        })),
        paymentMethod:       data.paymentMethod,
        specialInstructions: data.specialInstructions || undefined,
        assignedStaff:       data.assignedStaff || undefined,
        discount:            data.discount || 0,
        pickupFee,
        deliveryFee,
        pricing: {
          subtotal,
          pickupFee,
          deliveryFee,
          discount: watchDiscount,
          tax,
          total,
        },
      };

      if (data.orderType === 'pickup-delivery') {
        orderPayload.pickupAddress   = data.pickupAddress;
        orderPayload.deliveryAddress = data.deliveryAddress;
      }

      await createOrder(orderPayload);
      toast.success('Order created successfully');
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create order');
    }
  };

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Order"
      description="Create a new order on behalf of a customer"
      className="max-w-3xl"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Customer ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Customer</h3>
            <Input
              placeholder="Search customers by name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCustomers.map((c) => {
                        const customerDocId = c.customerId?._id || c.customerId;
                        const userId        = c.id || c._id;
                        const valueId       = customerDocId || userId;
                        return (
                          <SelectItem key={userId} value={valueId}>
                            {c.name} — {c.phone}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* ── Order Configuration ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="serviceLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="express">Express</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="pickup-delivery">Pickup & Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* ── Items ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ itemType: '', serviceType: 'wash-fold', quantity: 1, unitPrice: 0, description: '' })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Item
              </Button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-3 text-xs text-muted-foreground font-medium">Item</span>
              <span className="col-span-3 text-xs text-muted-foreground font-medium">Service</span>
              <span className="col-span-2 text-xs text-muted-foreground font-medium">Qty</span>
              <span className="col-span-2 text-xs text-muted-foreground font-medium">Unit Price (₦)</span>
              <span className="col-span-1 text-xs text-muted-foreground font-medium text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                {/* Item name */}
                <div className="col-span-3">
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
                </div>

                {/* Per-item service type */}
                <div className="col-span-3">
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
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unit price */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row subtotal */}
                <div className="col-span-1 text-sm font-medium text-right pt-2">
                  ₦{((watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0)).toLocaleString()}
                </div>

                {/* Delete */}
                <div className="col-span-1 flex justify-center pt-1">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Pickup/Delivery Addresses (conditional) ────────────────── */}
          {watchOrderType === 'pickup-delivery' && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Pickup Address</h3>
                  <FormField
                    control={form.control}
                    name="pickupAddress.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pickupAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="City" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Delivery Address</h3>
                  <FormField
                    control={form.control}
                    name="deliveryAddress.street"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="City" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* ── Staff & Payment ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="assignedStaff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Staff (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Array.isArray(staff) ? staff : []).map((s: any) => (
                        <SelectItem key={s._id || s.id} value={s._id || s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
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
                    placeholder="Any special instructions for this order..."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* ── Pricing Summary ────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
            <h3 className="text-sm font-semibold">Pricing Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              {pickupFee > 0 && (
                <div className="flex justify-between">
                  <span>Pickup Fee</span>
                  <span>₦{pickupFee.toLocaleString()}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>₦{deliveryFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Discount</span>
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <Input type="number" min={0} className="w-24 h-7 text-right text-sm" {...field} />
                  )}
                />
              </div>
              <div className="flex justify-between">
                <span>Tax (7.5%)</span>
                <span>₦{tax.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
              Create Order
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
