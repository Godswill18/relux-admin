// ============================================================================
// CREATE ORDER MODAL - Admin Order Creation Form
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
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
import {
  useWalkInCustomerMatch, CustomerMatchNotice, IdentityConflictPicker,
  getIdentityConflict, customerOutcomeMessage, type ConflictCandidate,
} from '@/components/shared/WalkInCustomerMatch';
import { useOrderStore } from '@/stores/useOrderStore';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useServiceStore } from '@/stores/useServiceStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { toast } from 'sonner';
import { Loader2, UserSearch, Tag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { OrderLinesEditor, OrderLinesSummary, draftTotals } from '@/components/orders/OrderLinesEditor';
import {
  type DraftLine, buildGarmentCatalogue, emptyLine, lineProblem, linePayload, estimateLine, orderLevelAddons,
} from '@/lib/orderLines';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createOrderSchema = z.object({
  // walkInCustomer is what the backend requires for all staff-created orders
  walkInCustomer: z.object({
    name:  z.string().min(1, 'Customer name is required'),
    phone: z.string().min(1, 'Customer phone is required'),
    // Optional — lets the customer verify ownership by email and activate an
    // online account later. There is no SMS verification, so without an email a
    // walk-in cannot self-activate.
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  }),
  serviceLevel:        z.string().optional(), // kept for legacy compat
  serviceLevelId:      z.string().optional(), // DB id of the selected level
  orderType:           z.enum(['walk-in', 'pickup-delivery']),
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
  const { customers, setFilters } = useCustomerStore();
  const {
    services, categories, serviceLevels, addons,
    fetchServices, fetchCategories, fetchServiceLevels, fetchAddons,
  } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedCustomerTier, setSelectedCustomerTier] = useState<any>(null);

  useEffect(() => {
    if (open) {
      // Reset customer search filter and trigger initial load
      setFilters({ search: undefined });
      fetchServices();
      fetchCategories();
      fetchServiceLevels();
      fetchAddons();
      fetchStaff();
    } else {
      setSelectedAddonIds([]);
      setSelectedCustomerTier(null);
      setFilters({ search: undefined });
    }
  }, [open, setFilters, fetchServices, fetchCategories, fetchServiceLevels, fetchAddons, fetchStaff]);

  // Debounce customer search → server-side query
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters({ search: customerSearch || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch, setFilters]);

  // Active services, levels, and add-ons
  const activeLevels   = (Array.isArray(serviceLevels) ? serviceLevels : []);
  // Order-level add-ons only — per-garment add-ons are chosen on each line
  const activeAddons   = orderLevelAddons(addons);
  const catalogue      = useMemo(() => buildGarmentCatalogue(services, categories), [services, categories]);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const form = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      walkInCustomer:      { name: '', phone: '', email: '' },
      serviceLevel:        '',
      serviceLevelId:      '',
      orderType:           'walk-in',
      paymentMethod:       'cash',
      specialInstructions: '',
      discount:            0,
      assignedStaff:       '',
      pickupAddress:       { street: '', city: '', state: '' },
      deliveryAddress:     { street: '', city: '', state: '' },
    },
  });

  const isSubmitting      = form.formState.isSubmitting;
  const watchOrderType    = form.watch('orderType');
  const watchDiscount     = form.watch('discount') || 0;
  const watchServiceLevId = form.watch('serviceLevelId');

  // Resolve the selected service level object for live pricing
  const selectedLevel = (Array.isArray(serviceLevels) ? serviceLevels : [])
    .find((lvl: any) => (lvl.id || lvl._id) === watchServiceLevId);
  const levelPct      = selectedLevel?.percentageAdjustment ?? 0;

  // Pricing preview — the server prices every line itself on submit
  const { serviceTotal: subtotal, lineAddonsTotal, garments } = draftTotals(lines, catalogue, addons);
  const basePickupFee   = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const baseDeliveryFee = watchOrderType === 'pickup-delivery' ? 500 : 0;
  const serviceLevelFee = Math.round(subtotal * levelPct / 100);

  // Loyalty tier — apply benefits client-side for preview
  const tierDiscountPct    = selectedCustomerTier?.discountPercent ?? 0;
  const tierDiscountAmount = tierDiscountPct > 0 ? Math.round(subtotal * tierDiscountPct / 100) : 0;
  const pickupFee          = selectedCustomerTier?.freePickup    ? 0 : basePickupFee;
  const deliveryFee        = selectedCustomerTier?.freeDelivery  ? 0 : baseDeliveryFee;

  // Add-ons fee: calculated client-side for preview; backend recalculates from DB on submit
  const selectedAddons  = activeAddons.filter((a) => selectedAddonIds.includes(a.id || a._id));
  const orderAddonsFee  = selectedAddons.reduce((sum, a) => {
    const amount = a.type === 'fixed' ? a.value : Math.round(subtotal * a.value / 100);
    return sum + amount;
  }, 0);
  const addonsFee       = orderAddonsFee + lineAddonsTotal;

  const total = Math.max(0, subtotal + pickupFee + deliveryFee + serviceLevelFee + addonsFee - watchDiscount - tierDiscountAmount);

  // ── Auto-fill customer fields from existing customer dropdown ───────────
  // customers from store is already server-filtered via debounced setFilters above
  const filteredCustomers = Array.isArray(customers) ? customers : [];

  // Existing customer record chosen from the search or the conflict picker.
  // Sent as customerRecordId so the order is attached to exactly that record.
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictCandidate[] | null>(null);
  const watchedPhone = form.watch('walkInCustomer.phone');
  const watchedEmail = form.watch('walkInCustomer.email');
  const { match: customerMatch, matchKind, checking: checkingMatch } = useWalkInCustomerMatch(watchedPhone, watchedEmail);

  const handleSelectExistingCustomer = (customerId: string) => {
    const customer = (Array.isArray(customers) ? customers : []).find(
      (c) => (c.id || c._id) === customerId || (c.customerId?._id || c.customerId) === customerId
    );
    if (customer) {
      form.setValue('walkInCustomer.name',  customer.name  || '', { shouldValidate: true });
      form.setValue('walkInCustomer.phone', customer.phone || '', { shouldValidate: true });
      form.setValue('walkInCustomer.email', customer.email || '', { shouldValidate: true });
      setSelectedRecordId((customer as any).customerRecordId || (customer as any).customerId?._id || null);
      setConflict(null);
      // Capture tier for live pricing preview (backend applies authoritative calculation)
      const tier = customer.customerId?.loyaltyTierId ?? customer.loyaltyTierId ?? null;
      setSelectedCustomerTier(tier && tier.active !== false ? tier : null);
    }
  };

  const onSubmit = async (data: CreateOrderForm, recordIdOverride?: string) => {
    // Same checks the server makes, so the counter sees them before submitting
    const problem = lines.map(lineProblem).find(Boolean);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      const primaryServiceType = estimateLine(lines[0], catalogue, addons).serviceName || undefined;

      const orderPayload: any = {
        walkInCustomer:           { ...data.walkInCustomer, email: data.walkInCustomer.email || undefined },
        customerRecordId:         recordIdOverride || selectedRecordId || undefined,
        serviceType:              primaryServiceType,
        serviceLevel:             selectedLevel?.name || data.serviceLevel || '',
        serviceLevelId:           data.serviceLevelId || undefined,
        serviceLevelName:         selectedLevel?.name || '',
        serviceLevelPercentage:   levelPct,
        orderType:                data.orderType,
        // Ids and quantities only — the server prices each line
        items:                    lines.map(linePayload),
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

      const created: any = await createOrder(orderPayload);
      toast.success(customerOutcomeMessage(created?.customerRecord));
      form.reset();
      setLines([emptyLine()]);
      setSelectedRecordId(null);
      setConflict(null);
      setCustomerSearch('');
      setSelectedAddonIds([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      // Phone and email belong to two different customers: nothing was saved.
      // Staff pick the right record, then the same form is resubmitted.
      const candidates = getIdentityConflict(err);
      if (candidates) {
        setConflict(candidates);
        return;
      }
      toast.error(err?.response?.data?.message || 'Failed to create order');
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
        <form onSubmit={form.handleSubmit((d) => onSubmit(d))} className="space-y-6">

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
                      <Input
                        placeholder="08012345678"
                        {...field}
                        // Changing the contact details un-selects a chosen customer.
                        onChange={(e) => { field.onChange(e); setSelectedRecordId(null); setConflict(null); }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="walkInCustomer.email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="customer@example.com"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => { field.onChange(e); setSelectedRecordId(null); setConflict(null); }}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Lets the customer activate an online account and see their orders.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {conflict ? (
              <IdentityConflictPicker
                candidates={conflict}
                onCancel={() => setConflict(null)}
                onPick={(id) => {
                  setSelectedRecordId(id);
                  setConflict(null);
                  form.handleSubmit((d) => onSubmit(d, id))();
                }}
              />
            ) : (
              <CustomerMatchNotice
                match={customerMatch}
                matchKind={matchKind}
                checking={checkingMatch}
                hasContact={!!(watchedPhone || watchedEmail)}
                confirmedRecordId={selectedRecordId}
                onConfirm={setSelectedRecordId}
              />
            )}
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
            <div>
              <h3 className="text-sm font-semibold">Items</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                One line per garment and service. Add the same garment again for a different service,
                and put add-ons on just the garments that need them. Prices come from the price list.
              </p>
            </div>
            <OrderLinesEditor
              lines={lines}
              onChange={setLines}
              catalogue={catalogue}
              addons={addons}
              allowCustom
              disabled={isSubmitting}
            />
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
              <OrderLinesSummary lines={lines} catalogue={catalogue} addons={addons} />
              {garments > 0 && <Separator className="my-1" />}
              <div className="flex justify-between">
                <span>Service total</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              {lineAddonsTotal > 0 && (
                <div className="flex justify-between text-purple-700 dark:text-purple-400">
                  <span>Garment add-ons</span>
                  <span>₦{lineAddonsTotal.toLocaleString()}</span>
                </div>
              )}
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
              {selectedCustomerTier && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <span>
                    {selectedCustomerTier.name} Tier Benefit
                    {tierDiscountPct > 0 ? ` (−${tierDiscountPct}%)` : ''}
                    {selectedCustomerTier.freePickup && basePickupFee > 0 ? ' · Free Pickup' : ''}
                    {selectedCustomerTier.freeDelivery && baseDeliveryFee > 0 ? ' · Free Delivery' : ''}
                    {selectedCustomerTier.priorityTurnaround ? ' · Priority' : ''}
                  </span>
                  <span>{tierDiscountAmount > 0 ? `−₦${tierDiscountAmount.toLocaleString()}` : 'Applied'}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Manual Discount</span>
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
