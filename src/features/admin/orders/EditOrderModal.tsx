// ============================================================================
// EDIT ORDER MODAL — Full parity with CreateOrderModal
// Walk-in orders: customer name/phone editable.
// Registered orders: customer fields locked (identity protection).
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrderStore } from '@/stores/useOrderStore';
import { useServiceStore } from '@/stores/useServiceStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import {
  Loader2, Plus, Trash2, Wand2, Tag,
  AlertTriangle, ArrowRight, Wallet, Lock,
} from 'lucide-react';

// ── Schema ─────────────────────────────────────────────────────────────────────

const orderItemSchema = z.object({
  _id:         z.string().optional(),
  categoryId:  z.string().optional(),
  serviceId:   z.string().min(1, 'Service required'),
  itemType:    z.string().min(1, 'Item required'),
  quantity:    z.coerce.number().min(1, 'Min quantity is 1'),
  unitPrice:   z.coerce.number().min(0, 'Price must be 0 or more'),
  description: z.string().optional(),
});

const editOrderSchema = z.object({
  walkInCustomer: z.object({
    name:  z.string(),
    phone: z.string(),
  }),
  serviceLevel:        z.string().optional(),
  serviceLevelId:      z.string().optional(),
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
  specialInstructions: z.string().optional(),
  notes:               z.string().optional(),
  discount:            z.coerce.number().min(0).default(0),
  editNote:            z.string().optional(),
});

type EditOrderForm = z.infer<typeof editOrderSchema>;

// ── Props ──────────────────────────────────────────────────────────────────────

interface EditOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSaved?: (updatedOrder: any) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EditOrderModal({ open, onOpenChange, order, onSaved }: EditOrderModalProps) {
  const { updateOrder } = useOrderStore();
  const {
    services, categories, serviceLevels, addons,
    fetchServices, fetchCategories, fetchServiceLevels, fetchAddons,
  } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // ── Customer type detection ─────────────────────────────────────────────────
  // Walk-in: created offline by staff, has walkInCustomer.name
  // Registered: online order tied to a user account
  const isWalkIn = !!(order?.walkInCustomer?.name) || order?.orderSource === 'offline';

  // ── Active data ─────────────────────────────────────────────────────────────
  const activeServices = (Array.isArray(services) ? services : []).filter((s) => s.isActive !== false);
  const activeLevels   = (Array.isArray(serviceLevels) ? serviceLevels : []);
  const activeAddons   = (Array.isArray(addons) ? addons : []).filter((a) => a.isActive !== false);

  // ── Fetch on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      fetchServices();
      fetchCategories();
      fetchServiceLevels();
      fetchAddons();
      fetchStaff();
    }
  }, [open, fetchServices, fetchCategories, fetchServiceLevels, fetchAddons, fetchStaff]);

  // ── Computed pre-fill values (BEFORE useForm so it can seed defaultValues) ──
  // Recomputes when: the order changes, services load, or levels load.
  // All three are needed so every Select has its matching option available.
  const computedValues = useMemo(() => {
    if (!order) return null;

    const findServiceId = (name: string) => {
      if (!name) return '';
      const s = activeServices.find(
        (sv: any) => sv.name === name || sv.name?.toLowerCase() === name?.toLowerCase()
      );
      return s?.id || s?._id || '';
    };

    const resolvedItems = (order.items || []).map((item: any) => ({
      _id:         item._id        || undefined,
      categoryId:  item.categoryId || undefined,
      serviceId:   findServiceId(item.serviceName || item.serviceType),
      itemType:    item.itemType   || '',
      quantity:    item.quantity   || 1,
      unitPrice:   item.unitPrice  || 0,
      description: item.description || '',
    }));

    // Safely extract serviceLevelId regardless of whether it is a populated
    // object, a plain string, or null  (typeof null === 'object' in JS).
    const slRaw = order.serviceLevelId;
    const resolvedLevelId =
      slRaw && typeof slRaw === 'object'
        ? String(slRaw._id || '')
        : String(slRaw || '');

    return {
      walkInCustomer: {
        name:  isWalkIn ? (order.walkInCustomer?.name  || '') : (order.customer?.name  || ''),
        phone: isWalkIn ? (order.walkInCustomer?.phone || '') : (order.customer?.phone || ''),
      },
      serviceLevelId:      resolvedLevelId,
      serviceLevel:        order.serviceLevel || '',
      orderType:           (order.orderType as 'walk-in' | 'pickup-delivery') || 'walk-in',
      items: resolvedItems.length > 0
        ? resolvedItems
        : [{ serviceId: '', itemType: '', quantity: 1, unitPrice: 0, description: '' }],
      pickupAddress:       order.pickupAddress   || { street: '', city: '', state: '' },
      deliveryAddress:     order.deliveryAddress || { street: '', city: '', state: '' },
      assignedStaff:       order.assignedStaff?._id || order.assignedStaff || '',
      specialInstructions: order.specialInstructions || '',
      notes:               order.notes || '',
      discount:            order.pricing?.discount || 0,
      editNote:            '',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id, activeServices.length, activeLevels.length]);

  // Empty fallback for the very first render before any order is selected
  const emptyDefaults: EditOrderForm = {
    walkInCustomer: { name: '', phone: '' },
    serviceLevelId: '', serviceLevel: '', orderType: 'walk-in',
    items: [{ serviceId: '', itemType: '', quantity: 1, unitPrice: 0, description: '' }],
    pickupAddress: { street: '', city: '', state: '' },
    deliveryAddress: { street: '', city: '', state: '' },
    assignedStaff: '', specialInstructions: '', notes: '', discount: 0, editNote: '',
  };

  // ── Form — seeded with computedValues so Selects render correctly on mount ──
  const form = useForm<EditOrderForm>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: computedValues ?? emptyDefaults,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  // ── Re-sync form when data loads asynchronously after first render ──────────
  // (The component key in the parent ensures a full remount on order change;
  //  this effect only handles the case where services/levels finish loading
  //  after the initial render and some serviceIds were blank.)
  useEffect(() => {
    if (!computedValues || !open) return;
    form.reset(computedValues);
    setSelectedAddonIds(
      (order?.addons || [])
        .map((a: any) => (a.addonId?._id || a.addonId)?.toString())
        .filter(Boolean)
    );
  }, [computedValues, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const resolveServiceId = (name: string) => {
    if (!name) return '';
    const found = activeServices.find(
      (s) => s.name === name || s.name?.toLowerCase() === name?.toLowerCase()
    );
    return found?.id || found?._id || '';
  };

  const getCategoriesForService = (serviceId: string) => {
    if (!serviceId) return [];
    return (Array.isArray(categories) ? categories : []).filter((c) => {
      const catServiceId = (c.serviceId?._id || c.serviceId)?.toString();
      return catServiceId === serviceId && c.isActive !== false;
    });
  };

  const handleServiceChange = (index: number, serviceId: string) => {
    form.setValue(`items.${index}.serviceId`, serviceId);
    form.setValue(`items.${index}.itemType`, '');
    form.setValue(`items.${index}.unitPrice`, 0);
  };

  const handleItemChange = (index: number, categoryName: string) => {
    form.setValue(`items.${index}.itemType`, categoryName);
    const rowServiceId = form.getValues(`items.${index}.serviceId`);
    const category = (Array.isArray(categories) ? categories : []).find((c) => {
      const catServiceId = (c.serviceId?._id || c.serviceId)?.toString();
      return c.name === categoryName && (!rowServiceId || catServiceId === rowServiceId);
    });
    if (category?.basePrice != null) {
      form.setValue(`items.${index}.unitPrice`, category.basePrice, { shouldValidate: true });
    }
  };

  // ── Live pricing ────────────────────────────────────────────────────────────
  const watchItems        = form.watch('items');
  const watchOrderType    = form.watch('orderType');
  const watchDiscount     = form.watch('discount') || 0;
  const watchServiceLevId = form.watch('serviceLevelId');

  const selectedLevel = activeLevels.find((lvl: any) => (lvl.id || lvl._id) === watchServiceLevId);
  const levelPct      = selectedLevel?.percentageAdjustment ?? 0;

  const subtotal        = watchItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const pickupFee       = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const deliveryFee     = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const serviceLevelFee = Math.round(subtotal * levelPct / 100);

  const selectedAddons = activeAddons.filter((a) => selectedAddonIds.includes(a.id || a._id));
  const addonsFee      = selectedAddons.reduce((sum, a) => {
    const amount = a.type === 'fixed' ? a.value : Math.round(subtotal * a.value / 100);
    return sum + amount;
  }, 0);

  const total = Math.max(0, subtotal + pickupFee + deliveryFee + serviceLevelFee + addonsFee - watchDiscount);

  // ── Price diff preview ──────────────────────────────────────────────────────
  const previousTotal = order?.pricing?.total || order?.total || 0;
  const difference    = Math.round((previousTotal - total) * 100) / 100; // positive = refund
  const paidViaWallet = order?.payment?.method === 'wallet' && order?.paymentStatus === 'paid';
  const isLocked      = ['completed', 'delivered', 'cancelled'].includes(order?.status || '');

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (data: EditOrderForm) => {
    if (!order) return;

    // Walk-in customer: require name + phone
    if (isWalkIn) {
      if (!data.walkInCustomer.name.trim()) {
        form.setError('walkInCustomer.name', { message: 'Customer name is required' });
        return;
      }
      if (!data.walkInCustomer.phone.trim()) {
        form.setError('walkInCustomer.phone', { message: 'Customer phone is required' });
        return;
      }
    }

    const orderId = order._id || order.id;
    const resolveServiceType = (serviceId: string) =>
      activeServices.find((s) => (s.id || s._id) === serviceId)?.name || serviceId;

    try {
      const payload: Record<string, any> = {
        serviceLevel:           selectedLevel?.name || data.serviceLevel || '',
        serviceLevelId:         data.serviceLevelId || undefined,
        serviceLevelName:       selectedLevel?.name || '',
        serviceLevelPercentage: levelPct,
        orderType:              data.orderType,
        items: data.items.map((item) => ({
          _id:         item._id || undefined,
          itemType:    item.itemType,
          serviceType: resolveServiceType(item.serviceId),
          serviceName: resolveServiceType(item.serviceId),
          quantity:    item.quantity,
          unitPrice:   item.unitPrice,
          total:       item.quantity * item.unitPrice,
          categoryId:  item.categoryId || undefined,
          description: item.description || undefined,
        })),
        assignedStaff:       data.assignedStaff || undefined,
        specialInstructions: data.specialInstructions || undefined,
        notes:               data.notes || undefined,
        discount:            data.discount || 0,
        pickupFee,
        deliveryFee,
        addons:  selectedAddonIds.map((id) => ({ addonId: id })),
        editNote: data.editNote || undefined,
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

      // Only send walkInCustomer for walk-in orders (protect registered user identity)
      if (isWalkIn) {
        payload.walkInCustomer = {
          name:  data.walkInCustomer.name.trim(),
          phone: data.walkInCustomer.phone.trim(),
        };
      }

      if (data.orderType === 'pickup-delivery') {
        payload.pickupAddress   = data.pickupAddress;
        payload.deliveryAddress = data.deliveryAddress;
      }

      await updateOrder(orderId, payload);

      // Re-fetch to get populated editHistory
      const { default: apiClient } = await import('@/lib/api/client');
      const res = await apiClient.get(`/orders/${orderId}`);
      const updatedOrder = res.data?.data?.order || res.data?.data;

      toast.success(
        difference > 0 && paidViaWallet
          ? `Order saved. ₦${difference.toLocaleString()} refunded to customer wallet.`
          : difference < 0
            ? `Order saved. Additional payment of ₦${Math.abs(difference).toLocaleString()} required.`
            : 'Order updated successfully.'
      );
      onSaved?.(updatedOrder);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update order');
    }
  };

  if (!order) return null;

  const isSubmitting = form.formState.isSubmitting;

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Order"
      description={`${order.orderNumber || order.code || `Order #${order._id?.slice(0, 8)}`} — ${
        isWalkIn
          ? order.walkInCustomer?.name || '—'
          : order.customer?.name || '—'
      }`}
      className="max-w-3xl"
    >
      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This order is <strong className="ml-1">{order.status}</strong> and cannot be edited.
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={`space-y-6 ${isLocked ? 'pointer-events-none opacity-60' : ''}`}
        >

          {/* ── Customer ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Customer</h3>
              {isWalkIn ? (
                <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-600">
                  Walk-in
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 border-blue-400 text-blue-600">
                  <Lock className="h-3 w-3" />
                  Registered customer
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="walkInCustomer.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Customer Name
                      {isWalkIn && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Full name"
                          disabled={!isWalkIn}
                          className={!isWalkIn ? 'bg-muted cursor-not-allowed' : ''}
                          {...field}
                        />
                        {!isWalkIn && (
                          <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        )}
                      </div>
                    </FormControl>
                    {!isWalkIn && (
                      <p className="text-xs text-muted-foreground">
                        Registered customer — cannot be edited.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walkInCustomer.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phone Number
                      {isWalkIn && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="08012345678"
                          disabled={!isWalkIn}
                          className={!isWalkIn ? 'bg-muted cursor-not-allowed' : ''}
                          {...field}
                        />
                        {!isWalkIn && (
                          <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        )}
                      </div>
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
                    key={field.value || '__none'}
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
                  <Select key={field.value || 'walk-in'} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      <SelectItem value="pickup-delivery">Pickup &amp; Delivery</SelectItem>
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

            {/* Desktop column headers */}
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
              const selectedItemType     = watchItems[index]?.itemType  || '';
              const categoriesForService = getCategoriesForService(selectedServiceId);
              const matchedCategory      = categoriesForService.find((c) => c.name === selectedItemType);
              const isAutoFilled         = matchedCategory && matchedCategory.basePrice === watchItems[index]?.unitPrice;
              const rowTotal             = (watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0);

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
                  {/* Mobile card */}
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

                  {/* Desktop row */}
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

          {/* ── Pickup / Delivery Addresses ────────────────────────────── */}
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

          {/* ── Staff & Instructions ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="assignedStaff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Staff (Optional)</FormLabel>
                  <Select key={field.value || '__unassigned'} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes (not visible to customer)…"
                      className="resize-none"
                      rows={1}
                      {...field}
                    />
                  </FormControl>
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
                    placeholder="Any special instructions for this order…"
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Add-ons ────────────────────────────────────────────────── */}
          {activeAddons.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Add-ons (Optional)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeAddons.map((addon) => {
                    const id      = addon.id || addon._id;
                    const label   = addon.type === 'fixed'
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
            </>
          )}

          <Separator />

          {/* ── Pricing Summary ────────────────────────────────────────── */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
            <h3 className="text-sm font-semibold">Pricing Summary</h3>
            <div className="space-y-1 text-sm">
              {/* Per-item lines */}
              {watchItems.filter((item) => item.itemType && (item.unitPrice ?? 0) > 0).map((item, i) => {
                const svc      = activeServices.find((s) => (s.id || s._id) === item.serviceId);
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

          {/* ── Price diff from previous total ─────────────────────────── */}
          {previousTotal > 0 && total !== previousTotal && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-sm font-medium">Price Change</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Previous Total</p>
                  <p className="font-medium">₦{previousTotal.toLocaleString()}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">New Total</p>
                  <p className="font-medium">₦{total.toLocaleString()}</p>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <p className="text-xs text-muted-foreground">Difference</p>
                  <p className={`font-semibold ${difference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {difference > 0 ? '−' : '+'}₦{Math.abs(difference).toLocaleString()}
                  </p>
                </div>
              </div>

              {difference > 0 && paidViaWallet && (
                <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-2">
                  <Wallet className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>₦{difference.toLocaleString()}</strong> will be automatically refunded to the customer's wallet.
                  </span>
                </div>
              )}

              {difference > 0 && !paidViaWallet && order?.paymentStatus === 'paid' && (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Paid via <strong>{order?.payment?.method}</strong>. Manual refund of{' '}
                    <strong>₦{difference.toLocaleString()}</strong> may be required.
                  </span>
                </div>
              )}

              {difference < 0 && (
                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Additional payment of <strong>₦{Math.abs(difference).toLocaleString()}</strong> required.
                    Payment status will be updated to <strong>Partial</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Edit Note ──────────────────────────────────────────────── */}
          <FormField
            control={form.control}
            name="editNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Reason for Edit{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-sm"
                    placeholder="e.g. Customer added extra items"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLocked}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </ModalForm>
  );
}
