// ============================================================================
// ADD-ONS TAB — Full CRUD: create, edit, toggle active, delete
// Each add-on has a name, type (fixed ₦ or percentage %), value, and status.
// ============================================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Pencil, Trash2, Loader2, Tag, DollarSign, Percent,
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

// ── Schema ────────────────────────────────────────────────────────────────────

const addonSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(60, 'Max 60 characters'),
  type:         z.enum(['fixed', 'percentage'], { required_error: 'Type is required' }),
  value:        z.coerce.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be 0 or positive'),
  description:  z.string().max(200).optional(),
  displayOrder: z.coerce.number().min(0).optional(),
}).refine(
  (d) => !(d.type === 'percentage' && d.value > 100),
  { message: 'Percentage cannot exceed 100', path: ['value'] }
);
type AddonForm = z.infer<typeof addonSchema>;

// ── Form Dialog ───────────────────────────────────────────────────────────────

function AddonFormDialog({
  open, onOpenChange, initial, onSave, title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSave: (values: AddonForm) => Promise<void>;
  title: string;
}) {
  const form = useForm<AddonForm>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      name:         initial?.name         ?? '',
      type:         initial?.type         ?? 'fixed',
      value:        initial?.value        ?? 0,
      description:  initial?.description  ?? '',
      displayOrder: initial?.displayOrder ?? 0,
    },
  });

  const watchType = form.watch('type');
  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: AddonForm) => {
    await onSave(values);
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
                      {watchType === 'percentage'
                        ? 'Applied to order subtotal (items only)'
                        : 'Flat fee added to order total'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
    addons, isLoading,
    createAddon, updateAddon, deleteAddon,
  } = useServiceStore();

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  const list: any[] = Array.isArray(addons) ? addons : [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  const valueLabel = (addon: any) =>
    addon.type === 'fixed'
      ? `+₦${Number(addon.value).toLocaleString()}`
      : `+${addon.value}% of subtotal`;

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
