// ============================================================================
// ORDER LINES EDITOR — build an order out of garment lines
//
// Each line is one garment type, a quantity and ONE service, plus optional
// add-ons applied to some or all of those garments (starch on 2 of 5 shirts).
// The same garment can be added again with a different service. Prices shown
// are a preview — the server prices every line from the price list.
// ============================================================================

import { Copy, Minus, Plus, Trash2, Lock, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  type DraftLine, type GarmentEntry, CUSTOM_GARMENT, emptyLine, estimateLine,
  findOption, lineAddonsFor, naira, newLineKey, addonUnitPrice, addonSummary,
} from '@/lib/orderLines';

interface OrderLinesEditorProps {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  catalogue: GarmentEntry[];
  addons: any[];
  /** Staff may add a counter item that is not in the price list */
  allowCustom?: boolean;
  disabled?: boolean;
}

const idOf = (v: any) => String(v?._id ?? v?.id ?? v ?? '');

function QtyStepper({
  value, min = 1, max, onChange, disabled, label,
}: { value: number; min?: number; max?: number; onChange: (n: number) => void; disabled?: boolean; label: string }) {
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
        onClick={() => onChange(clamp((value || min) - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number" inputMode="numeric" min={min} max={max}
        className="h-8 w-14 text-center px-1"
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? clamp(n) : min);
        }}
        disabled={disabled}
        aria-label={label}
      />
      <Button
        type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
        onClick={() => onChange(clamp((value || 0) + 1))}
        disabled={disabled || (max != null && value >= max)}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function OrderLinesEditor({
  lines, onChange, catalogue, addons, allowCustom = false, disabled = false,
}: OrderLinesEditorProps) {
  const update = (key: string, patch: Partial<DraftLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const setQuantity = (line: DraftLine, quantity: number) => {
    // An add-on can never cover more garments than the line has
    update(line.key, {
      quantity,
      addons: line.addons.map((a) => ({ ...a, quantity: Math.min(a.quantity, quantity) })),
    });
  };

  const setGarment = (line: DraftLine, garment: string) => {
    if (garment === CUSTOM_GARMENT) {
      update(line.key, { garment, manual: true, categoryId: '', addons: [], itemType: '', serviceName: '', unitPrice: 0 });
      return;
    }
    const entry = catalogue.find((g) => g.garment === garment);
    // One service for this garment → pick it straight away
    const only = entry && entry.options.length === 1 ? entry.options[0] : null;
    update(line.key, {
      garment, manual: false, categoryId: only?.categoryId || '',
      addons: only ? line.addons.filter((a) => lineAddonsFor(addons, only.serviceId).some((x) => idOf(x) === a.addonId)) : [],
    });
  };

  const setService = (line: DraftLine, categoryId: string) => {
    const opt = findOption(catalogue, categoryId);
    const allowed = new Set(lineAddonsFor(addons, opt?.serviceId).map(idOf));
    update(line.key, { categoryId, addons: line.addons.filter((a) => allowed.has(a.addonId)) });
  };

  const toggleAddon = (line: DraftLine, addonId: string, on: boolean) => {
    update(line.key, {
      addons: on
        ? [...line.addons, { addonId, quantity: 1 }]
        : line.addons.filter((a) => a.addonId !== addonId),
    });
  };

  const setAddonQty = (line: DraftLine, addonId: string, quantity: number) =>
    update(line.key, { addons: line.addons.map((a) => (a.addonId === addonId ? { ...a, quantity } : a)) });

  const duplicate = (line: DraftLine) => {
    const copy: DraftLine = {
      ...line,
      key: newLineKey(),
      _id: undefined,
      readyQuantity: 0,
      collectedQuantity: 0,
      agreedCategoryId: undefined,
      agreedUnitPrice: undefined,
      agreedAddonPrices: undefined,
      addons: line.addons.map((a) => ({ ...a })),
    };
    const at = lines.findIndex((l) => l.key === line.key);
    onChange([...lines.slice(0, at + 1), copy, ...lines.slice(at + 1)]);
  };

  const remove = (key: string) => onChange(lines.filter((l) => l.key !== key));

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        const est = estimateLine(line, catalogue, addons);
        const entry = catalogue.find((g) => g.garment === line.garment);
        const option = findOption(catalogue, line.categoryId);
        const available = line.manual ? lineAddonsFor(addons) : (option ? lineAddonsFor(addons, option.serviceId) : []);
        const ready = line.readyQuantity || 0;
        const collected = line.collectedQuantity || 0;
        const locked = ready > 0 || collected > 0;
        const garmentMissingFromList = !line.manual && line.garment && !entry;

        return (
          <div key={line.key} className="rounded-lg border bg-muted/20 p-3 space-y-3">
            {/* ── Row 1: garment · service · quantity · total ─────────────── */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Item {index + 1}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold mr-2">{est.complete ? naira(est.lineTotal) : '—'}</span>
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => duplicate(line)} disabled={disabled} title="Duplicate this line"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => remove(line.key)} disabled={disabled || locked || lines.length === 1}
                  title={locked ? 'Garments on this line are already ready or collected' : 'Remove this line'}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_auto] gap-2 items-end">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Garment</p>
                {/* Radix Select can emit '' when its value is set programmatically
                    (the hidden native select has no matching option yet) — ignore it */}
                <Select value={line.garment || undefined} onValueChange={(v) => v && setGarment(line, v)} disabled={disabled || locked}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>
                    {catalogue.length === 0 && (
                      <SelectItem value="__none" disabled>No items in the price list</SelectItem>
                    )}
                    {catalogue.map((g) => (
                      <SelectItem key={g.garment} value={g.garment}>{g.garment}</SelectItem>
                    ))}
                    {garmentMissingFromList && (
                      <SelectItem value={line.garment} disabled>{line.garment} (no longer listed)</SelectItem>
                    )}
                    {allowCustom && <SelectItem value={CUSTOM_GARMENT}>Custom item (not in price list)…</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {line.manual ? (
                <div className="grid grid-cols-[1fr_1fr_90px] gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Item name</p>
                    <Input className="h-9" value={line.itemType || ''} placeholder="e.g. Curtain" disabled={disabled || locked}
                      onChange={(e) => update(line.key, { itemType: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Service</p>
                    <Input className="h-9" value={line.serviceName || ''} placeholder="e.g. Wash Only" disabled={disabled || locked}
                      onChange={(e) => update(line.key, { serviceName: e.target.value })} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price (₦)</p>
                    <Input className="h-9" type="number" min={0} value={line.unitPrice ?? 0} disabled={disabled}
                      onChange={(e) => update(line.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Service</p>
                  <Select
                    value={line.categoryId || undefined}
                    onValueChange={(v) => v && setService(line, v)}
                    disabled={disabled || locked || !line.garment}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={line.garment ? 'Select service' : 'Pick the item first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(entry?.options || []).map((o) => {
                        const agreed = line._id && line.agreedCategoryId === o.categoryId ? line.agreedUnitPrice : undefined;
                        return (
                          <SelectItem key={o.categoryId} value={o.categoryId}>
                            {o.serviceName}
                            <span className="text-xs text-muted-foreground ml-1.5">
                              {naira(agreed ?? o.price)}/{o.unit}{agreed != null && agreed !== o.price ? ' (agreed)' : ''}
                            </span>
                          </SelectItem>
                        );
                      })}
                      {!entry && line.categoryId && (
                        <SelectItem value={line.categoryId} disabled>{line.garment} (no longer listed)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Qty</p>
                <QtyStepper
                  value={line.quantity} min={Math.max(1, ready)} label={`quantity for item ${index + 1}`}
                  onChange={(n) => setQuantity(line, n)} disabled={disabled}
                />
              </div>
            </div>

            {est.complete && (
              <p className="text-xs text-muted-foreground">
                {line.quantity} × {naira(est.unitPrice)} = {naira(est.serviceTotal)}
                {est.addonsTotal > 0 && <> · add-ons {naira(est.addonsTotal)}</>}
              </p>
            )}

            {locked && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" />
                {ready} ready{collected > 0 ? ` · ${collected} collected` : ''} — the item and service are fixed and the quantity can't go below {ready}.
              </p>
            )}

            {/* ── Add-ons for this line ───────────────────────────────────── */}
            {available.length > 0 && (line.categoryId || line.manual) && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Add-ons for these garments</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {available.map((addon) => {
                    const id = idOf(addon);
                    const chosen = line.addons.find((a) => a.addonId === id);
                    const per = addonUnitPrice(addon, {
                      lineUnitPrice: est.unitPrice,
                      garmentName: line.manual ? line.itemType : line.garment,
                      serviceId: option?.serviceId,
                    });
                    return (
                      <div key={id} className={`rounded-md border p-2 ${chosen ? 'border-primary bg-primary/5' : 'bg-background'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={!!chosen}
                            onCheckedChange={(v) => toggleAddon(line, id, !!v)}
                            disabled={disabled}
                          />
                          <span className="text-sm font-medium flex-1">{addon.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {addon.type === 'percentage' ? `${addon.value}% · ` : ''}{naira(per)}/garment
                          </span>
                        </label>
                        {chosen && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-muted-foreground">Apply to</span>
                            <QtyStepper
                              value={chosen.quantity} min={1} max={line.quantity} label={`${addon.name} quantity`}
                              onChange={(n) => setAddonQty(line, id, n)} disabled={disabled}
                            />
                            <span className="text-muted-foreground">of {line.quantity}</span>
                            {chosen.quantity < line.quantity && (
                              <button
                                type="button" className="underline text-primary"
                                onClick={() => setAddonQty(line, id, line.quantity)} disabled={disabled}
                              >
                                all {line.quantity}
                              </button>
                            )}
                            <span className="ml-auto font-medium">{naira(per * chosen.quantity)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Note ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                className="h-8 text-sm" placeholder="Note for this line (optional) — e.g. stain on collar"
                maxLength={500} value={line.notes}
                onChange={(e) => update(line.key, { notes: e.target.value })} disabled={disabled}
              />
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, emptyLine()])} disabled={disabled}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add another garment / service
      </Button>
    </div>
  );
}

/** Per-line summary with the garment count (sum of quantities, not lines). */
export function OrderLinesSummary({
  lines, catalogue, addons,
}: { lines: DraftLine[]; catalogue: GarmentEntry[]; addons: any[] }) {
  const estimates = lines.map((line) => ({ line, e: estimateLine(line, catalogue, addons) }));
  const rows = estimates.filter((r) => r.e.complete);
  if (rows.length === 0) return null;
  const garments = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  // Same add-on on different garments/lines, aggregated — never the only view:
  // the per-line breakdown above always shows which garment it's actually on.
  // Only shown once add-ons actually span more than one line — otherwise it
  // would just repeat the single line above it.
  const linesWithAddons = rows.filter((r) => r.e.addons.length > 0).length;
  const summary = linesWithAddons > 1 ? addonSummary(rows.map((r) => r.e)) : [];
  return (
    <div className="space-y-1.5">
      {rows.map(({ line, e }) => (
        <div key={line.key} className="text-xs">
          <div className="flex justify-between gap-2">
            <span>
              <span className="font-medium">{e.garment} × {line.quantity}</span>
              {e.serviceName && <span className="text-muted-foreground"> — {e.serviceName}</span>}
            </span>
            <span>{naira(e.serviceTotal)}</span>
          </div>
          {e.addons.map((a) => (
            <div key={a.addonId} className="flex justify-between gap-2 pl-3 text-muted-foreground">
              <span>+ {a.name} × {a.quantity}</span>
              <span>{naira(a.total)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="flex justify-between text-xs text-muted-foreground pt-1">
        <span>Total garments</span>
        <span className="font-medium text-foreground">{garments}</span>
      </div>
      {summary.length > 0 && (
        <div className="pt-1.5 mt-1 border-t space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Add-on summary</p>
          {summary.map((a) => (
            <div key={a.addonId} className="flex justify-between gap-2 text-xs text-purple-700 dark:text-purple-400">
              <span>{a.name} — {a.quantity} garment{a.quantity === 1 ? '' : 's'}</span>
              <span>{naira(a.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Totals of a draft, for the pricing summary. */
export function draftTotals(lines: DraftLine[], catalogue: GarmentEntry[], addons: any[]) {
  const estimates = lines.map((l) => estimateLine(l, catalogue, addons));
  return {
    serviceTotal: estimates.reduce((s, e) => s + e.serviceTotal, 0),
    lineAddonsTotal: estimates.reduce((s, e) => s + e.addonsTotal, 0),
    garments: lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
  };
}
