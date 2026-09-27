// ============================================================================
// ADD-ONS TAB — Full CRUD: create, edit, toggle active, delete
// Each add-on has a name, type (fixed ₦ or percentage %), value, and status,
// and is charged either once per order or per garment on an order line (e.g.
// starch on 2 of 5 shirts). Per-garment add-ons can be limited to services.
//
// A fixed, per-garment add-on may also carry price overrides by garment (and
// optionally by garment+service) — e.g. Stain Removal is ₦500 on a Shirt but
// ₦1,000 on a Bedsheet — set below the flat value. Percentage add-ons already
// scale with the garment through the line's own price, so this only applies
// to a fixed amount.
// ============================================================================

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Pencil, Trash2, Loader2, Tag, DollarSign, Percent, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

// ── Schema ────────────────────────────────────────────────────────────────────

const garmentPriceRowSchema = z.object({
  garmentName: z.string().min(1, 'Choose a garment'),
  serviceId:   z.string().optional(),
  price:       z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be 0 or positive'),
});

const addonSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(60, 'Max 60 characters'),
  type:         z.enum(['fixed', 'percentage'], { required_error: 'Type is required' }),
  value:        z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be 0 or positive'),
  description:  z.string().max(200).optional(),
  displayOrder: z.coerce.number().min(0).optional(),
  scope:        z.enum(['order', 'item']),
  eligibleServiceIds: z.array(z.string()),
  garmentPricing: z.array(garmentPriceRowSchema).default([]),
}).refine(
  (d) => !(d.type === 'percentage' && d.value > 100),
  { message: 'Percentage cannot exceed 100', path: ['value'] }
).refine(
  (d) => {
    const seen = new Set<string>();
    for (const r of d.garmentPricing) {
      const key = `${r.garmentName.trim().toLowerCase()}::${r.serviceId || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  },
  { message: 'The same garment (and service) is listed twice', path: ['garmentPricing'] }
);
type AddonForm = z.infer<typeof addonSchema>;

// ── Form Dialog ───────────────────────────────────────────────────────────────

const idOf = (v: any) => String(v?._id ?? v?.id ?? v ?? '');

function AddonFormDialog({
  open, onOpenChange, initial, onSave, title, services, garmentNames,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSave: (values: AddonForm) => Promise<void>;
  title: string;
  services: any[];
  /** Distinct garment names from the price list, for the per-garment override picker */
  garmentNames: string[];
}) {
  const form = useForm<AddonForm>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      name:         initial?.name         ?? '',
      type:         initial?.type         ?? 'fixed',
      value:        initial?.value        ?? 0,
      description:  initial?.description  ?? '',
      displayOrder: initial?.displayOrder ?? 0,
      // Add-ons saved before scope existed are order-level
      scope:        initial?.scope === 'item' ? 'item' : (initial ? 'order' : 'item'),
      eligibleServiceIds: (initial?.eligibleServiceIds || []).map(idOf),
      garmentPricing: (initial?.garmentPricing || []).map((r: any) => ({
        garmentName: r.garmentName || '', serviceId: r.serviceId ? idOf(r.serviceId) : undefined, price: r.price ?? 0,
      })),
    },
  });

  const watchType = form.watch('type');
  const watchScope = form.watch('scope');
  const watchEligible = form.watch('eligibleServiceIds');
  const isSubmitting = form.formState.isSubmitting;
  const { fields: priceRows, append: addPriceRow, remove: removePriceRow } = useFieldArray({
    control: form.control, name: 'garmentPricing',
  });
  // A price row's service dropdown is narrowed to whatever the add-on itself
  // is eligible for, when that's been restricted.
  const rowServiceOptions = watchEligible.length
    ? services.filter((s) => watchEligible.includes(idOf(s)))
    : services;
  const showGarmentPricing = watchType === 'fixed' && watchScope === 'item';

  const handleSubmit = async (values: AddonForm) => {
    // The pricing-overrides section only shows for a fixed, per-garment
    // add-on. If it's hidden but rows are still sitting in this form's state
    // (the admin switched type/scope away from fixed+item in this session),
    // clear them explicitly — sending them would fail the server's own check.
    // If it's hidden and there was nothing to clear, omit the key entirely so
    // an unrelated edit (e.g. just the description) never touches it.
    const payload = showGarmentPricing
      ? values
      : { ...values, garmentPricing: values.garmentPricing.length > 0 ? [] : undefined } as AddonForm;
    await onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add-on Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Stain Removal, Express Handling" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (₦)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchType === 'percentage' ? 'Percentage (%)' : 'Amount (₦)'}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={watchType === 'percentage' ? 100 : undefined}
                          step={watchType === 'percentage' ? 1 : 50}
                          placeholder="0"
                          className="pr-8"
                          {...field}
                        />
                        {watchType === 'percentage'
                          ? <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          : <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">₦</span>
                        }
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {watchScope === 'item'
                        ? (watchType === 'percentage'
                          ? "Per garment: % of that line's unit price"
                          : 'Per garment it is applied to')
                        : (watchType === 'percentage'
                          ? 'Applied to order subtotal (items only)'
                          : 'Flat fee added to order total')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Charged</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="item">Per garment — chosen on each order line</SelectItem>
                      <SelectItem value="order">Once per order</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    {field.value === 'item'
                      ? 'Staff and customers pick how many garments on a line get it (e.g. starch on 2 of 5 shirts).'
                      : 'Charged once on the whole order.'}
                    {' '}Changing this only affects new orders.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchScope === 'item' && services.length > 0 && (
              <FormField
                control={form.control}
                name="eligibleServiceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available with</FormLabel>
                    <div className="grid grid-cols-2 gap-1.5 rounded-md border p-2">
                      {services.map((svc) => {
                        const id = idOf(svc);
                        const checked = field.value.includes(id);
                        return (
                          <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => field.onChange(
                                v ? [...field.value, id] : field.value.filter((x: string) => x !== id)
                              )}
                            />
                            {svc.name}
                          </label>
                        );
                      })}
                    </div>
                    <FormDescription className="text-xs">
                      Leave all unticked to allow it with every service.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showGarmentPricing && (
              <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Price by garment <span className="text-muted-foreground font-normal">(optional)</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Override the flat amount above for specific garments — e.g. Stain Removal at ₦500 on a
                    Shirt but ₦1,000 on a Bedsheet. Narrow a row to one service, or leave it for any service
                    that garment is ordered under. A garment with no row here uses the flat amount.
                  </p>
                </div>

                {priceRows.length > 0 && (
                  <div className="space-y-2">
                    {priceRows.map((row, i) => (
                      <div key={row.id} className="grid grid-cols-[1fr_1fr_90px_28px] gap-1.5 items-start">
                        <FormField
                          control={form.control}
                          name={`garmentPricing.${i}.garmentName`}
                          render={({ field }) => (
                            <FormItem>
                              {garmentNames.length > 0 ? (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Garment" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {garmentNames.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input className="h-8 text-xs" placeholder="Garment name" {...field} />
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`garmentPricing.${i}.serviceId`}
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                onValueChange={(v) => field.onChange(v === '__any' ? undefined : v)}
                                value={field.value ?? '__any'}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any service" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="__any">Any service</SelectItem>
                                  {rowServiceOptions.map((svc) => (
                                    <SelectItem key={idOf(svc)} value={idOf(svc)}>{svc.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`garmentPricing.${i}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" min={0} step={50} className="h-8 text-xs" placeholder="₦" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removePriceRow(i)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {typeof form.formState.errors.garmentPricing?.message === 'string' && (
                      <p className="text-xs text-destructive">{form.formState.errors.garmentPricing.message}</p>
                    )}
                  </div>
                )}

                <Button
                  type="button" variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => addPriceRow({ garmentName: garmentNames[0] || '', serviceId: undefined, price: 0 })}
                >
                  <Plus className="mr-1 h-3 w-3" /> Add garment price
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Brief description shown to customers" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">Lower numbers appear first.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function AddonsTab() {
  const {
    addons, services, categories, isLoading,
    createAddon, updateAddon, deleteAddon,
  } = useServiceStore();
  const activeServices = (Array.isArray(services) ? services : []).filter((s: any) => s.isActive !== false);
  // Distinct garment names from the price list (a garment like "Shirt" spans
  // several categories, one per service) — powers the per-garment price picker.
  const garmentNames = [...new Set(
    (Array.isArray(categories) ? categories : [])
      .filter((c: any) => c.isActive !== false && c.name)
      .map((c: any) => String(c.name).trim())
  )].sort((a, b) => a.localeCompare(b));

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  const list: any[] = Array.isArray(addons) ? addons : [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  const valueLabel = (addon: any) => {
    if (addon.scope === 'item') {
      return addon.type === 'fixed'
        ? `+₦${Number(addon.value).toLocaleString()} per garment`
        : `+${addon.value}% of the garment price`;
    }
    return addon.type === 'fixed'
      ? `+₦${Number(addon.value).toLocaleString()} per order`
      : `+${addon.value}% of subtotal`;
  };

  const serviceNames = (addon: any) => {
    const ids: string[] = (addon.eligibleServiceIds || []).map(idOf);
    if (addon.scope !== 'item' || ids.length === 0) return null;
    return activeServices.filter((s: any) => ids.includes(idOf(s))).map((s: any) => s.name).join(', ');
  };

  const garmentPriceSummary = (addon: any) => {
    const rows: any[] = addon.garmentPricing || [];
    if (!rows.length) return null;
    const svcName = (id: any) => activeServices.find((s: any) => idOf(s) === idOf(id))?.name;
    return rows
      .map((r) => `${r.garmentName}${r.serviceId ? ` (${svcName(r.serviceId) || 'a service'})` : ''} ₦${Number(r.price).toLocaleString()}`)
      .join(', ');
  };

  const handleCreate = async (values: AddonForm) => {
    try {
      await createAddon(values);
      toast.success(`Add-on "${values.name}" created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create add-on');
      throw err;
    }
  };

  const handleEdit = async (values: AddonForm) => {
    try {
      await updateAddon(editTarget.id, values);
      toast.success(`"${values.name}" updated`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update add-on');
      throw err;
    }
  };

  const handleToggleActive = async (addon: any) => {
    try {
      await updateAddon(addon.id, { active: !addon.isActive });
      toast.success(`${addon.name} ${addon.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update add-on');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const msg = await deleteAddon(deleteTarget.id);
      toast.success(msg || `"${deleteTarget.name}" removed`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete add-on');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.length} add-on{list.length !== 1 ? 's' : ''} configured
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Add-on
        </Button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-28" /></Card>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Tag className="h-10 w-10 opacity-25" />
          <p className="text-sm">No add-ons yet. Click <strong>Add Add-on</strong> to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((addon) => (
            <Card key={addon.id} className={!addon.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{addon.name}</p>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{addon.description}</p>
                    )}
                  </div>
                  <Badge variant={addon.isActive ? 'default' : 'secondary'} className="text-xs shrink-0">
                    {addon.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Value badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold border ${
                    addon.type === 'percentage'
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                      : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                  }`}>
                    {addon.type === 'percentage'
                      ? <Percent className="h-3.5 w-3.5" />
                      : <DollarSign className="h-3.5 w-3.5" />
                    }
                    {valueLabel(addon)}
                  </span>
                </div>
                {serviceNames(addon) && (
                  <p className="text-xs text-muted-foreground">Only with: {serviceNames(addon)}</p>
                )}
                {garmentPriceSummary(addon) && (
                  <p className="text-xs text-muted-foreground">Priced by garment: {garmentPriceSummary(addon)}</p>
                )}

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={addon.isActive} onCheckedChange={() => handleToggleActive(addon)} />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditTarget(addon)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(addon)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <AddonFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Add-on"
        onSave={handleCreate}
        services={activeServices}
        garmentNames={garmentNames}
      />

      {/* Edit dialog */}
      {editTarget && (
        <AddonFormDialog
          key={editTarget.id}
          open={!!editTarget}
          onOpenChange={(v) => { if (!v) setEditTarget(null); }}
          initial={editTarget}
          title={`Edit "${editTarget.name}"`}
          onSave={handleEdit}
          services={activeServices}
          garmentNames={garmentNames}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Remove Add-on"
        description={
          <>
            Remove <strong>{deleteTarget?.name}</strong>? If this add-on has been used in orders,
            it will be <em>deactivated</em> instead of permanently deleted to preserve order history.
          </>
        }
        confirmLabel="Remove"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
