// ============================================================================
// SERVICE LEVELS TAB — Full CRUD: create, edit, toggle active, delete
// Each level has a name + percentageAdjustment (0 = no markup, 20 = +20%)
// ============================================================================

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus, Pencil, Trash2, Loader2, Percent, Gauge,
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
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useServiceStore } from '@/stores/useServiceStore';
import { toast } from 'sonner';

// ── Schema ────────────────────────────────────────────────────────────────────

const levelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Max 50 characters'),
  percentageAdjustment: z.coerce
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Must be 0 or positive')
    .max(1000, 'Maximum 1000%'),
  description: z.string().max(200).optional(),
  displayOrder: z.coerce.number().min(0).optional(),
  priorityLevel: z.coerce.number().min(1).max(10),
});
type LevelForm = z.infer<typeof levelSchema>;

// ── Form Dialog ───────────────────────────────────────────────────────────────

function LevelFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSave: (values: LevelForm) => Promise<void>;
  title: string;
}) {
  const form = useForm<LevelForm>({
    resolver: zodResolver(levelSchema),
    defaultValues: {
      name:                 initial?.name               ?? '',
      percentageAdjustment: initial?.percentageAdjustment ?? 0,
      description:          initial?.description         ?? '',
      displayOrder:         initial?.displayOrder        ?? 0,
      priorityLevel:        initial?.priorityLevel       ?? 1,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: LevelForm) => {
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
                  <FormLabel>Level Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Express, Premium, Same-Day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="percentageAdjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Adjustment (%)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        className="pr-8"
                        {...field}
                      />
                      <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    0 = no markup (standard). 20 = base price +20%.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Brief description shown to staff/customers" {...field} />
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
                  <FormDescription className="text-xs">Lower numbers appear first in dropdowns.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priorityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5" />
                    Priority Level
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        step={1}
                        placeholder="1"
                        {...field}
                        onChange={(e) => {
                          const v = Math.min(10, Math.max(1, Number(e.target.value) || 1));
                          field.onChange(v);
                        }}
                      />
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                          const active = Number(field.value) === n;
                          const cls = n <= 3
                            ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                            : n <= 6
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : n <= 8
                            ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400';
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => field.onChange(n)}
                              className={`flex-1 text-xs font-bold py-1 rounded border transition-all ${cls} ${active ? 'ring-2 ring-offset-1 ring-current scale-110' : 'opacity-60 hover:opacity-100'}`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    1–3 Low · 4–6 Medium · 7–8 High · 9–10 Critical. Shown as a badge on all orders using this level.
                  </FormDescription>
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

export function ServiceLevelsTab() {
  const {
    serviceLevels, isLoading,
    createServiceLevel, updateServiceLevel, deleteServiceLevel,
  } = useServiceStore();

  const [createOpen,   setCreateOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting,   setIsDeleting]   = useState(false);

  const levels: any[] = Array.isArray(serviceLevels) ? serviceLevels : [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pctLabel = (pct: number) =>
    pct === 0 ? 'No markup' : `+${pct}%`;

  const handleCreate = async (values: LevelForm) => {
    try {
      await createServiceLevel(values);
      toast.success(`Service level "${values.name}" created`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create service level');
      throw err;
    }
  };

  const handleEdit = async (values: LevelForm) => {
    try {
      await updateServiceLevel(editTarget.id, values);
      toast.success(`"${values.name}" updated`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update service level');
      throw err;
    }
  };

  const handleToggleActive = async (level: any) => {
    try {
      await updateServiceLevel(level.id, { active: !level.isActive });
      toast.success(`${level.name} ${level.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update service level');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteServiceLevel(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete service level');
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
          {levels.length} service level{levels.length !== 1 ? 's' : ''} configured
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Level
        </Button>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-28" /></Card>
          ))}
        </div>
      ) : levels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Percent className="h-10 w-10 opacity-25" />
          <p className="text-sm">No service levels yet. Click <strong>Add Level</strong> to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {levels.map((level) => (
            <Card key={level.id} className={!level.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{level.name}</p>
                    {level.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{level.description}</p>
                    )}
                  </div>
                  <Badge
                    variant={level.isActive ? 'default' : 'secondary'}
                    className="text-xs shrink-0"
                  >
                    {level.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Percentage */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-sm font-semibold">
                    <Percent className="h-3.5 w-3.5" />
                    {pctLabel(level.percentageAdjustment ?? 0)}
                  </span>
                  {level.percentageAdjustment > 0 && (
                    <span className="text-xs text-muted-foreground">above base price</span>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={level.isActive}
                      onCheckedChange={() => handleToggleActive(level)}
                    />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditTarget(level)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(level)}
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
      <LevelFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Service Level"
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      {editTarget && (
        <LevelFormDialog
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
        title="Delete Service Level"
        description={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
            Orders using this level will retain their snapshot data.
            If this level is in use by active orders, deletion will be blocked.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
