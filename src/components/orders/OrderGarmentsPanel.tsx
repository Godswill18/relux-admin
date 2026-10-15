// ============================================================================
// ORDER GARMENTS PANEL — each line of an order, where its garments are, and
// the counter actions: mark garments ready, and release ready garments to the
// customer (a partial or full collection). Every collection is recorded
// separately and listed in the history below.
//
// The backend enforces every rule shown here (never more than is ready, never
// twice at once); the dialogs only make the numbers easy to get right.
// ============================================================================

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  CheckCircle2, PackageCheck, Loader2, History, Minus, Plus, AlertTriangle, Info, Undo2, Shirt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api/client';
import {
  FULFILMENT_STATUS_CONFIG, fulfilmentOf, fulfilmentShortLabel, lineAddonsTotal, lineServiceLabel,
  lineServiceTotal, naira, newLineKey, addonSummary,
} from '@/lib/orderLines';

const MANAGE_ROLES = ['staff', 'admin', 'manager', 'receptionist', 'developer'];
// Roles arrive lowercase from the API; the Role enum is uppercase — accept both.
export const canManageGarments = (role?: string) => !!role && MANAGE_ROLES.includes(String(role).toLowerCase());

const fmt = (d?: string) => {
  if (!d) return '—';
  try { return format(new Date(d), 'MMM d, yyyy · h:mm a'); } catch { return '—'; }
};

export function FulfilmentBadge({ status }: { status?: string }) {
  const cfg = status ? FULFILMENT_STATUS_CONFIG[status] : null;
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

/** Compact list badge — only when an order is part-way: "3/5 ready", "2/5 collected". */
export function GarmentProgressBadge({ order }: { order: any }) {
  const label = fulfilmentShortLabel(order);
  if (!label) return null;
  const cfg = FULFILMENT_STATUS_CONFIG[fulfilmentOf(order).status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg?.className || ''}`}>
      {label}
    </span>
  );
}

/** Segmented bar: collected | ready and waiting | still processing */
function ProgressBar({ quantity, ready, collected }: { quantity: number; ready: number; collected: number }) {
  if (!quantity) return null;
  const pct = (n: number) => `${(n / quantity) * 100}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="bg-green-600" style={{ width: pct(collected) }} />
      <div className="bg-emerald-400" style={{ width: pct(ready - collected) }} />
    </div>
  );
}

function Stepper({ value, max, onChange, disabled, label }: {
  value: number; max: number; onChange: (n: number) => void; disabled?: boolean; label: string;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= 0} aria-label={`Fewer ${label}`}>
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input type="number" inputMode="numeric" min={0} max={max} className="h-8 w-14 text-center px-1"
        value={value} disabled={disabled} aria-label={label}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))} />
      <Button type="button" variant="outline" size="icon" className="h-8 w-8"
        onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label={`More ${label}`}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const errorMessage = (err: any, fallback: string) => {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(', ') : (m || fallback);
};

// ── Mark ready ───────────────────────────────────────────────────────────────

function MarkReadyDialog({ order, open, onOpenChange, onDone }: {
  order: any; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void;
}) {
  const f = fulfilmentOf(order);
  const [undo, setUndo] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = f.lines.map((l: any) => ({
    ...l,
    max: undo ? l.ready - l.collected : l.processing,
  }));
  const selected = rows.reduce((s: number, r: any) => s + (qty[String(r.itemId)] || 0), 0);

  const reset = () => { setQty({}); setNotes(''); setUndo(false); };
  const submit = async (all = false) => {
    setBusy(true);
    try {
      const body = all
        ? { all: true, notes: notes || undefined }
        : {
            undo,
            notes: notes || undefined,
            items: rows.filter((r: any) => (qty[String(r.itemId)] || 0) > 0)
              .map((r: any) => ({ itemId: r.itemId, quantity: qty[String(r.itemId)] })),
          };
      const res = await apiClient.post(`/orders/${order._id}/items/ready`, body);
      toast.success(res.data?.message || 'Updated');
      reset();
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update the garments'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{undo ? 'Move garments back to processing' : 'Mark garments ready'}</DialogTitle>
          <DialogDescription>
            {undo
              ? 'A correction for garments marked ready by mistake. Garments already collected cannot be moved back.'
              : 'Choose how many garments on each line are finished. The customer is told when the first ones — and then all of them — are ready.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {rows.map((r: any) => {
            const id = String(r.itemId);
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.itemType} × {r.quantity}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.serviceName ? `${r.serviceName} · ` : ''}{r.ready} ready · {r.processing} processing
                    {r.collected > 0 ? ` · ${r.collected} collected` : ''}
                  </p>
                </div>
                {r.max > 0 ? (
                  <Stepper value={qty[id] || 0} max={r.max} disabled={busy} label={`${r.itemType} to ${undo ? 'move back' : 'mark ready'}`}
                    onChange={(n) => setQty((p) => ({ ...p, [id]: n }))} />
                ) : (
                  <span className="text-xs text-muted-foreground">{undo ? 'Nothing to move back' : 'All ready'}</span>
                )}
              </div>
            );
          })}
        </div>

        <Textarea rows={2} placeholder="Note (optional)" value={notes} maxLength={500}
          onChange={(e) => setNotes(e.target.value)} disabled={busy} />

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => { setUndo(!undo); setQty({}); }} disabled={busy}>
            {undo ? <><CheckCircle2 className="mr-1.5 h-4 w-4" />Mark ready instead</> : <><Undo2 className="mr-1.5 h-4 w-4" />Correct a mistake</>}
          </Button>
          <div className="flex gap-2">
            {!undo && f.processingGarments > 0 && (
              <Button type="button" variant="outline" onClick={() => submit(true)} disabled={busy}>
                All remaining ({f.processingGarments})
              </Button>
            )}
            <Button type="button" onClick={() => submit(false)} disabled={busy || selected === 0}
              variant={undo ? 'destructive' : 'default'}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {undo ? `Move back ${selected || ''}` : `Mark ${selected || ''} ready`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Collect ──────────────────────────────────────────────────────────────────

// Exported so the QR scan-to-deliver flow (DeliveryConfirmPage) can offer the
// same partial collection — a scan shouldn't only mean "release everything".
export function CollectDialog({ order, open, onOpenChange, onDone }: {
  order: any; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void;
}) {
  const f = fulfilmentOf(order);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  // One key per opening of the dialog: a double tap or a retried request
  // returns the same collection instead of releasing garments twice.
  const idempotencyKey = useMemo(() => (open ? newLineKey() : ''), [open]);

  const selected = f.lines.reduce((s: number, l: any) => s + (qty[String(l.itemId)] || 0), 0);
  const unpaid = (order.paymentStatus || order.payment?.status) !== 'paid';
  const after = f.collectedGarments + selected;

  const reset = () => { setQty({}); setName(''); setPhone(''); setCode(''); setNotes(''); };
  const selectAll = () => setQty(Object.fromEntries(f.lines.map((l: any) => [String(l.itemId), l.awaitingCollection])));

  const submit = async () => {
    setBusy(true);
    try {
      const res = await apiClient.post(`/orders/${order._id}/collections`, {
        items: f.lines.filter((l: any) => (qty[String(l.itemId)] || 0) > 0)
          .map((l: any) => ({ itemId: l.itemId, quantity: qty[String(l.itemId)] })),
        collectedBy: name || phone ? { name: name || undefined, phone: phone || undefined } : undefined,
        orderCode: code.trim() || undefined,
        notes: notes || undefined,
        idempotencyKey,
      });
      toast.success(res.data?.message || 'Collection recorded');
      reset();
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not record the collection'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { if (!v) reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Release garments to the customer</DialogTitle>
          <DialogDescription>
            Only garments that are ready can be released. Anything left stays on the order for the next visit.
          </DialogDescription>
        </DialogHeader>

        {unpaid && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Payment is <strong className="capitalize">{order.paymentStatus || 'unpaid'}</strong>. Garments can still be
              released; the order is only marked completed once it's paid.
            </span>
          </div>
        )}

        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {f.lines.map((l: any) => {
            const id = String(l.itemId);
            return (
              <div key={id} className={`rounded-md border p-2.5 ${l.awaitingCollection === 0 ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{l.itemType} × {l.quantity}</p>
                    <p className="text-xs text-muted-foreground">{l.serviceName || '—'}</p>
                  </div>
                  {l.awaitingCollection > 0 ? (
                    <Stepper value={qty[id] || 0} max={l.awaitingCollection} disabled={busy} label={`${l.itemType} to collect now`}
                      onChange={(n) => setQty((p) => ({ ...p, [id]: n }))} />
                  ) : (
                    <span className="text-xs text-muted-foreground text-right">
                      {l.collected >= l.quantity ? 'All collected' : 'None ready yet'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 grid grid-cols-3 text-[11px] text-muted-foreground">
                  <span>Ready: <strong className="text-foreground">{l.ready}</strong></span>
                  <span>Already collected: <strong className="text-foreground">{l.collected}</strong></span>
                  <span>Available now: <strong className="text-foreground">{l.awaitingCollection}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Collected by (optional)</Label>
            <Input className="h-8 mt-1" value={name} maxLength={120} onChange={(e) => setName(e.target.value)}
              placeholder={order.walkInCustomer?.name || order.customer?.name || 'Name'} disabled={busy} />
          </div>
          <div>
            <Label className="text-xs">Their phone (optional)</Label>
            <Input className="h-8 mt-1" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} disabled={busy} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Order code from the receipt (optional — checks it matches)</Label>
            <Input className="h-8 mt-1 font-mono uppercase" value={code} maxLength={20}
              onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={busy} />
          </div>
        </div>
        <Textarea rows={2} placeholder="Note (optional)" value={notes} maxLength={500}
          onChange={(e) => setNotes(e.target.value)} disabled={busy} />

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <p className="text-xs text-muted-foreground self-center">
            After this: {after} of {f.totalGarments} collected
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={selectAll} disabled={busy || f.awaitingCollection === 0}>
              All available ({f.awaitingCollection})
            </Button>
            <Button type="button" onClick={submit} disabled={busy || selected === 0}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Collect {selected || ''} selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<string, string> = {
  tracking_started: 'Garment tracking started',
  ready: 'Marked ready',
  ready_undone: 'Moved back to processing',
  collected: 'Collected',
};
const METHOD_LABEL: Record<string, string> = {
  counter: 'At the counter',
  delivery: 'Delivered',
  status_update: 'Order marked completed',
};

export function OrderGarmentsPanel({ order, canManage, onChanged }: {
  order: any;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [readyOpen, setReadyOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const f = fulfilmentOf(order);
  const items: any[] = order?.items || [];
  const collections: any[] = order?.collections || [];
  const events: any[] = (order?.fulfilmentHistory || []).slice().reverse();
  const closedLegacy = !f.recorded && order?.status === 'completed';
  const actionable = canManage && order?.status !== 'cancelled' && !closedLegacy && items.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-2">
        <FulfilmentBadge status={f.status} />
        <span className="text-xs text-muted-foreground">
          {f.totalGarments} garment{f.totalGarments === 1 ? '' : 's'} · {f.processingGarments} processing ·{' '}
          {f.awaitingCollection} ready to collect · {f.collectedGarments} collected
        </span>
      </div>

      {!f.recorded && items.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            This order was placed before garment-level tracking. The counts are read from its status
            {closedLegacy
              ? '; its collection was not itemised at the time.'
              : '. Marking garments ready or collecting them starts tracking from here.'}
          </span>
        </div>
      )}

      {actionable && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setReadyOpen(true)}
            disabled={f.processingGarments === 0 && f.readyGarments === f.collectedGarments}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark garments ready
          </Button>
          <Button size="sm" onClick={() => setCollectOpen(true)} disabled={f.awaitingCollection === 0}>
            <PackageCheck className="mr-1.5 h-4 w-4" /> Collect ready items
            {f.awaitingCollection > 0 && <span className="ml-1.5 opacity-80">({f.awaitingCollection})</span>}
          </Button>
        </div>
      )}

      {/* Lines */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items</p>
      ) : (
        <div className="rounded-lg border divide-y">
          {items.map((item: any, idx: number) => {
            const l = f.lines.find((x: any) => String(x.itemId) === String(item._id)) || f.lines[idx];
            const service = lineServiceLabel(item);
            const addonsTotal = lineAddonsTotal(item);
            return (
              <div key={item._id || idx} className="px-3 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-1.5">
                      <Shirt className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.itemType || '—'} × {item.quantity}
                      {item.priceSource === 'manual' && (
                        <span className="text-[10px] rounded border px-1 text-muted-foreground">custom</span>
                      )}
                    </p>
                    {service && <p className="text-xs text-muted-foreground">{service}</p>}
                    {(item.addons || []).map((a: any, i: number) => (
                      <p key={i} className="text-xs text-purple-700 dark:text-purple-400">
                        + {a.name} × {a.quantity} <span className="text-muted-foreground">({naira(a.total)})</span>
                      </p>
                    ))}
                    {item.notes && <p className="text-xs italic text-muted-foreground">“{item.notes}”</p>}
                    {item.condition && <p className="text-xs text-muted-foreground">Condition: {item.condition}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{naira(lineServiceTotal(item) + addonsTotal)}</p>
                    <p className="text-xs text-muted-foreground">{naira(item.unitPrice ?? 0)} × {item.quantity}</p>
                  </div>
                </div>
                {l && order?.status !== 'cancelled' && (
                  <div className="space-y-1">
                    <ProgressBar quantity={l.quantity} ready={l.ready} collected={l.collected} />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{l.ready}</span> ready ·{' '}
                      <span className="text-foreground font-medium">{l.processing}</span> processing ·{' '}
                      <span className="text-foreground font-medium">{l.collected}</span> collected
                      {l.outstanding > 0 && l.collected > 0 && <> · {l.outstanding} outstanding</>}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add-on summary — aggregated across lines, e.g. "Stain Removal: 2
          garments, ₦1,500" for a Shirt at one price and a Bedsheet at another.
          Never the only view: the per-line list above always shows which
          garment each add-on is actually on. */}
      {(() => {
        const linesWithAddons = items.filter((i: any) => (i.addons || []).length > 0).length;
        if (linesWithAddons < 2) return null;
        const summary = addonSummary(items);
        return (
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Add-on summary</p>
            <div className="rounded-lg border divide-y">
              {summary.map((a) => (
                <div key={a.addonId} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{a.name} <span className="text-muted-foreground">— {a.quantity} garment{a.quantity === 1 ? '' : 's'}</span></span>
                  <span className="font-medium">
                    {naira(a.total)}
                    {a.variesByLine && <span className="text-muted-foreground font-normal"> (varies by garment)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Collection history */}
      {collections.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> Collection history
          </p>
          <div className="space-y-2">
            {collections.map((c: any) => (
              <div key={c._id} className="rounded-md border p-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">Collection #{c.sequence}</span>
                  <span className="text-xs text-muted-foreground">{fmt(c.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {METHOD_LABEL[c.method] || c.method}
                  {c.releasedBy?.name ? ` · released by ${c.releasedBy.name}` : ''}
                  {c.collectedBy?.name ? ` · collected by ${c.collectedBy.name}` : ''}
                  {c.verification === 'order_code' ? ' · order code checked' : ''}
                </p>
                <ul className="mt-1 text-xs">
                  {(c.items || []).map((i: any, k: number) => (
                    <li key={k}>• {i.itemType}{i.serviceName ? ` (${i.serviceName})` : ''} × {i.quantity}</li>
                  ))}
                </ul>
                {c.notes && <p className="text-xs italic text-muted-foreground mt-1">“{c.notes}”</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {events.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Garment activity ({events.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {events.map((e: any, i: number) => (
              <li key={e._id || i} className="flex flex-wrap gap-x-2">
                <span className="text-muted-foreground">{fmt(e.at)}</span>
                <span className="font-medium">{EVENT_LABEL[e.type] || e.type}{e.quantity ? ` — ${e.quantity}` : ''}</span>
                {(e.items || []).length > 0 && (
                  <span>{e.items.map((x: any) => `${x.itemType} ×${x.quantity}`).join(', ')}</span>
                )}
                {e.by?.name && <span className="text-muted-foreground">by {e.by.name}</span>}
                {e.source && e.source !== 'items' && <span className="text-muted-foreground">({e.source.replace('_', ' ')})</span>}
                {e.notes && <span className="italic text-muted-foreground">“{e.notes}”</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {actionable && (
        <>
          <MarkReadyDialog order={order} open={readyOpen} onOpenChange={setReadyOpen} onDone={onChanged} />
          <CollectDialog order={order} open={collectOpen} onOpenChange={setCollectOpen} onDone={onChanged} />
        </>
      )}
    </div>
  );
}
