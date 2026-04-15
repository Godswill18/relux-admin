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
import { Loader2, Plus, Trash2, Wand2, UserSearch, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const orderItemSchema = z.object({
  serviceId:   z.string().min(1, 'Service required'),
  itemType:    z.string().min(1, 'Item required'),
  quantity:    z.coerce.number().min(1, 'Min quantity is 1'),
  unitPrice:   z.coerce.number().min(0, 'Price must be 0 or more'),
  description: z.string().optional(),
});

const createOrderSchema = z.object({
  // walkInCustomer is what the backend requires for all staff-created orders
  walkInCustomer: z.object({
    name:  z.string().min(1, 'Customer name is required'),
    phone: z.string().min(1, 'Customer phone is required'),
  }),
  serviceLevel:        z.string().optional(), // kept for legacy compat
  serviceLevelId:      z.string().optional(), // DB id of the selected level
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
  onSuccess?: () => void;
}

export function CreateOrderModal({ open, onOpenChange, onSuccess }: CreateOrderModalProps) {
  const { createOrder } = useOrderStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const {
    services, categories, serviceLevels, addons,
    fetchServices, fetchCategories, fetchServiceLevels, fetchAddons,
  } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchServices();
      fetchCategories();
      fetchServiceLevels();
      fetchAddons();
      fetchStaff();
    } else {
      setSelectedAddonIds([]);
    }
  }, [open, fetchCustomers, fetchServices, fetchCategories, fetchServiceLevels, fetchAddons, fetchStaff]);

  // Active services, levels, and add-ons
  const activeServices = (Array.isArray(services) ? services : []).filter((s) => s.isActive !== false);
  const activeLevels   = (Array.isArray(serviceLevels) ? serviceLevels : []);
  const activeAddons   = (Array.isArray(addons) ? addons : []).filter((a) => a.isActive !== false);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      walkInCustomer:      { name: '', phone: '' },
      serviceLevel:        '',
      serviceLevelId:      '',
      orderType:           'walk-in',
      items:               [{ serviceId: '', itemType: '', quantity: 1, unitPrice: 0, description: '' }],
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

  const isSubmitting      = form.formState.isSubmitting;
  const watchItems        = form.watch('items');
  const watchOrderType    = form.watch('orderType');
  const watchDiscount     = form.watch('discount') || 0;
  const watchServiceLevId = form.watch('serviceLevelId');

  // Resolve the selected service level object for live pricing
  const selectedLevel = (Array.isArray(serviceLevels) ? serviceLevels : [])
    .find((lvl: any) => (lvl.id || lvl._id) === watchServiceLevId);
  const levelPct      = selectedLevel?.percentageAdjustment ?? 0;

  // Pricing
  const subtotal        = watchItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const pickupFee       = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const deliveryFee     = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const serviceLevelFee = Math.round(subtotal * levelPct / 100);

  // Add-ons fee: calculated client-side for preview; backend recalculates from DB on submit
  const selectedAddons  = activeAddons.filter((a) => selectedAddonIds.includes(a.id || a._id));
  const addonsFee       = selectedAddons.reduce((sum, a) => {
    const amount = a.type === 'fixed' ? a.value : Math.round(subtotal * a.value / 100);
    return sum + amount;
  }, 0);

  const total = Math.max(0, subtotal + pickupFee + deliveryFee + serviceLevelFee + addonsFee - watchDiscount);

  // ── Auto-fill customer fields from existing customer dropdown ───────────
  const filteredCustomers = (Array.isArray(customers) ? customers : [])
    .filter((c) =>
      customerSearch
        ? c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone?.includes(customerSearch)
        : true
    )
    .slice(0, 50);

  const handleSelectExistingCustomer = (customerId: string) => {
    const customer = (Array.isArray(customers) ? customers : []).find(
      (c) => (c.id || c._id) === customerId || (c.customerId?._id || c.customerId) === customerId
    );
    if (customer) {
      form.setValue('walkInCustomer.name',  customer.name  || '', { shouldValidate: true });
      form.setValue('walkInCustomer.phone', customer.phone || '', { shouldValidate: true });
    }
  };

  // ── Helper: get categories for a given service ID ───────────────────────
  const getCategoriesForService = (serviceId: string) => {
    if (!serviceId) return [];
    return (Array.isArray(categories) ? categories : []).filter((c) => {
      const catServiceId = (c.serviceId?._id || c.serviceId)?.toString();
      return catServiceId === serviceId && c.isActive !== false;
    });
  };

  // ── When service changes: clear item + reset price ──────────────────────
  const handleServiceChange = (index: number, serviceId: string) => {
    form.setValue(`items.${index}.serviceId`, serviceId);
    form.setValue(`items.${index}.itemType`, '');
    form.setValue(`items.${index}.unitPrice`, 0);
  };

  // ── When item (category) changes: auto-fill unit price ──────────────────
  const handleItemChange = (index: number, categoryName: string) => {
    form.setValue(`items.${index}.itemType`, categoryName);
    // Scope lookup to the service selected for this row so that identically-named
    // categories across different services resolve to the correct price.
    const rowServiceId = form.getValues(`items.${index}.serviceId`);
    const category = (Array.isArray(categories) ? categories : []).find((c) => {
      const catServiceId = (c.serviceId?._id || c.serviceId)?.toString();
      return c.name === categoryName && (!rowServiceId || catServiceId === rowServiceId);
    });
    if (category?.basePrice != null) {
      form.setValue(`items.${index}.unitPrice`, category.basePrice, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateOrderForm) => {
    try {
      const resolveServiceType = (serviceId: string) =>
        activeServices.find((s) => s.id === serviceId)?.name || serviceId;

      const primaryServiceType = resolveServiceType(data.items[0].serviceId);

      const orderPayload: any = {
        walkInCustomer:           data.walkInCustomer,
        serviceType:              primaryServiceType,
        serviceLevel:             selectedLevel?.name || data.serviceLevel || '',
        serviceLevelId:           data.serviceLevelId || undefined,
        serviceLevelName:         selectedLevel?.name || '',
        serviceLevelPercentage:   levelPct,
        orderType:                data.orderType,
        items:                    data.items.map((item) => ({
          itemType:    item.itemType,
          serviceType: resolveServiceType(item.serviceId),
          serviceName: resolveServiceType(item.serviceId),
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          total:       item.quantity * item.unitPrice,
          description: item.description || undefined,
        })),
        paymentMethod:            data.paymentMethod,
        specialInstructions:      data.specialInstructions || undefined,
        assignedStaff:            data.assignedStaff || undefined,
        discount:                 data.discount || 0,
        pickupFee,
        deliveryFee,
        addons: selectedAddonIds.map((id) => ({ addonId: id })),
        pricing: {
          subtotal,
          pickupFee,
          deliveryFee,
          serviceFee: serviceLevelFee,
          addOnsFee:  addonsFee,
          discount:   watchDiscount,
          tax:        0,
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
      setCustomerSearch('');
      setSelectedAddonIds([]);
      onOpenChange(false);
      onSuccess?.();
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

            {/* Quick-fill from existing customer */}
            <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <UserSearch className="h-3.5 w-3.5" />
                Autofill from existing customer (optional)
              </p>
              <Input
                placeholder="Search by name or phone…"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-8 text-sm"
              />
              {customerSearch && filteredCustomers.length > 0 && (
                <div className="rounded-md border bg-background shadow-sm max-h-40 overflow-y-auto">
                  {filteredCustomers.map((c) => {
                    const cid = c.customerId?._id || c.customerId || c.id || c._id;
                    return (
                      <button
                        key={c.id || c._id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          handleSelectExistingCustomer(cid);
                          setCustomerSearch('');
                        }}
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground ml-2">{c.phone}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Required customer fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="walkInCustomer.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walkInCustomer.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
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

          {/* ── Order Configuration ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="serviceLevelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Level</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      const lvl = activeLevels.find((l: any) => (l.id || l._id) === val);
                      form.setValue('serviceLevel', lvl?.name || '');
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeLevels.length > 0 ? (
                        activeLevels
                          .filter((lvl: any) => lvl.isActive !== false && !!(lvl.id || lvl._id))
                          .map((lvl: any) => {
                            const id  = lvl.id || lvl._id;
                            const pct = lvl.percentageAdjustment ?? 0;
                            const label = pct === 0 ? lvl.name : `${lvl.name} (+${pct}%)`;
                            return (
                              <SelectItem key={id} value={id}>
                                {label}
                              </SelectItem>
                            );
                          })
                      ) : (
                        <SelectItem value="__none" disabled>No service levels configured</SelectItem>
                      )}
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
              <div>
                <h3 className="text-sm font-semibold">Items</h3>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  Unit price auto-fills from the service price list
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ serviceId: '', itemType: '', quantity: 1, unitPrice: 0, description: '' })
                }
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Item
              </Button>
            </div>

            {/* ── Desktop column headers (hidden on mobile) ──────────── */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-1">
              <span className="col-span-3 text-xs text-muted-foreground font-medium">Service</span>
              <span className="col-span-3 text-xs text-muted-foreground font-medium">Item</span>
              <span className="col-span-2 text-xs text-muted-foreground font-medium">Qty</span>
              <span className="col-span-2 text-xs text-muted-foreground font-medium">Unit Price (₦)</span>
              <span className="col-span-1 text-xs text-muted-foreground font-medium text-right">Total</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => {
              const selectedServiceId    = watchItems[index]?.serviceId || '';
              const selectedItemType     = watchItems[index]?.itemType || '';
              const categoriesForService = getCategoriesForService(selectedServiceId);
              const matchedCategory      = categoriesForService.find((c) => c.name === selectedItemType);
              const isAutoFilled         = matchedCategory && matchedCategory.basePrice === watchItems[index]?.unitPrice;
              const rowTotal             = (watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0);

              // ── Shared field fragments ──────────────────────────────
              const ServiceField = (
                <FormField
                  control={form.control}
                  name={`items.${index}.serviceId`}
                  render={({ field: f }) => (
                    <FormItem>
                      <Select value={f.value} onValueChange={(val) => handleServiceChange(index, val)}>
                        <FormControl>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeServices.length === 0 ? (
                            <SelectItem value="__none" disabled>No services — add on Services page</SelectItem>
                          ) : (
                            activeServices
                              .filter((s) => !!(s.id || s._id))
                              .map((s) => {
                                const id = s.id || s._id;
                                return <SelectItem key={id} value={id}>{s.name}</SelectItem>;
                              })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

              const ItemField = (
                <FormField
                  control={form.control}
                  name={`items.${index}.itemType`}
                  render={({ field: f }) => (
                    <FormItem>
                      <Select
                        value={f.value}
                        onValueChange={(val) => handleItemChange(index, val)}
                        disabled={!selectedServiceId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder={selectedServiceId ? 'Select item' : 'Pick service first'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoriesForService.length === 0 ? (
                            <SelectItem value="__none" disabled>No items for this service</SelectItem>
                          ) : (
                            categoriesForService
                              .filter((c) => !!c.name)
                              .map((c) => (
                                <SelectItem key={c.id || c._id} value={c.name}>
                                  {c.name}
                                  <span className="text-xs text-muted-foreground ml-1.5">
                                    ₦{(c.basePrice || 0).toLocaleString()}/{c.unit || 'item'}
                                  </span>
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

              const QtyField = (
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" min={1} className="h-9 w-full" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

              const PriceField = (
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            className={`h-9 w-full ${isAutoFilled ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}`}
                            {...f}
                          />
                          {isAutoFilled && (
                            <Wand2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-green-500 pointer-events-none" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );

              const DeleteBtn = fields.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null;

              return (
                <div key={field.id}>
                  {/* ── Mobile: card layout ────────────────────────────── */}
                  <div className="md:hidden rounded-lg border p-3 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Item {index + 1}</span>
                      {DeleteBtn}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Service</p>
                        {ServiceField}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Item</p>
                        {ItemField}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Qty</p>
                          {QtyField}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            Unit Price (₦)
                            {isAutoFilled && <Wand2 className="h-2.5 w-2.5 text-green-500" />}
                          </p>
                          {PriceField}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-xs text-muted-foreground">Line total</span>
                        <span className="text-sm font-semibold">₦{rowTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Desktop: compact grid row ──────────────────────── */}
                  <div className="hidden md:grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">{ServiceField}</div>
                    <div className="col-span-3">{ItemField}</div>
                    <div className="col-span-2">{QtyField}</div>
                    <div className="col-span-2">{PriceField}</div>
                    <div className="col-span-1 text-sm font-medium text-right pt-2">
                      ₦{rowTotal.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-center pt-1">{DeleteBtn}</div>
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <Wand2 className="h-3 w-3" /> Green
              </span>
              = price from price list. Edit to override.
            </p>
          </div>

          {/* ── Pickup/Delivery Addresses (conditional) ────────────────── */}
          {watchOrderType === 'pickup-delivery' && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {(Array.isArray(staff) ? staff : [])
                        .filter((s: any) => !!(s._id || s.id))
                        .map((s: any) => {
                          const id = s._id || s.id;
                          return (
                            <SelectItem key={id} value={id}>
                              {s.name}
                            </SelectItem>
                          );
                        })}
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

          {/* ── Add-ons ────────────────────────────────────────────────── */}
          {activeAddons.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Add-ons (Optional)</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeAddons.map((addon) => {
                  const id     = addon.id || addon._id;
                  const label  = addon.type === 'fixed'
                    ? `+₦${Number(addon.value).toLocaleString()}`
                    : `+${addon.value}% of subtotal`;
                  const checked = selectedAddonIds.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                        checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelectedAddonIds((prev) =>
                            v ? [...prev, id] : prev.filter((x) => x !== id)
                          );
                        }}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">{addon.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        {addon.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{addon.description}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* ── Pricing Summary ────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
            <h3 className="text-sm font-semibold">Pricing Summary</h3>
            <div className="space-y-1 text-sm">
              {/* Per-item line items */}
              {watchItems.filter((item) => item.itemType && (item.unitPrice ?? 0) > 0).map((item, i) => {
                const svc = activeServices.find((s) => (s.id || s._id) === item.serviceId);
                const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
                return (
                  <div key={i} className="flex justify-between text-muted-foreground text-xs">
                    <span>
                      {svc?.name ? `${svc.name} — ` : ''}{item.itemType} × {item.quantity}
                    </span>
                    <span>₦{lineTotal.toLocaleString()}</span>
                  </div>
                );
              })}
              {watchItems.some((item) => item.itemType && (item.unitPrice ?? 0) > 0) && (
                <Separator className="my-1" />
              )}
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
              {serviceLevelFee > 0 && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span>
                    Service Level
                    {selectedLevel ? ` — ${selectedLevel.name} (+${levelPct}%)` : ''}
                  </span>
                  <span>₦{serviceLevelFee.toLocaleString()}</span>
                </div>
              )}
              {selectedAddons.map((addon) => {
                const id     = addon.id || addon._id;
                const amount = addon.type === 'fixed' ? addon.value : Math.round(subtotal * addon.value / 100);
                return (
                  <div key={id} className="flex justify-between text-purple-700 dark:text-purple-400">
                    <span>{addon.name} {addon.type === 'percentage' ? `(+${addon.value}%)` : ''}</span>
                    <span>₦{amount.toLocaleString()}</span>
                  </div>
                );
              })}
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
