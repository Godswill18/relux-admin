// ============================================================================
// ORDER LINES — shared helpers for building, pricing (preview) and describing
// itemised orders. The backend prices every line itself (utils/orderPricing.js);
// everything here is a preview that mirrors those rules so the counter sees
// the same number the server will charge.
// ============================================================================

export interface DraftAddon {
  addonId: string;
  quantity: number;
}

export interface DraftLine {
  /** React key — stable per row */
  key: string;
  /** Existing line id when editing an order */
  _id?: string;
  /** Garment name (e.g. "Shirt") — groups the price list across services */
  garment: string;
  /** The price-list entry: one garment under one service */
  categoryId: string;
  quantity: number;
  addons: DraftAddon[];
  notes: string;
  /** Counter item that is not in the price list (staff only) */
  manual?: boolean;
  itemType?: string;
  serviceName?: string;
  unitPrice?: number;
  /** Editing: garments already ready / collected on this line (from the server) */
  readyQuantity?: number;
  collectedQuantity?: number;
  /** Editing: prices agreed when the line was ordered (kept by the server) */
  agreedCategoryId?: string;
  agreedUnitPrice?: number;
  agreedAddonPrices?: Record<string, number>;
}

export interface GarmentOption {
  categoryId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  unit: string;
}

export interface GarmentEntry {
  garment: string;
  options: GarmentOption[];
}

export const CUSTOM_GARMENT = '__custom__';

const idOf = (v: any): string => String(v?._id ?? v?.id ?? v ?? '');

export const newLineKey = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const emptyLine = (): DraftLine => ({
  key: newLineKey(),
  garment: '',
  categoryId: '',
  quantity: 1,
  addons: [],
  notes: '',
});

/**
 * The price list as garments → the services that offer them, with prices.
 * Built from the active services and their categories, so a garment appears
 * once however many services price it.
 */
export function buildGarmentCatalogue(services: any[], categories: any[]): GarmentEntry[] {
  const activeServices = new Map<string, any>();
  for (const s of Array.isArray(services) ? services : []) {
    if (s && s.isActive !== false && s.active !== false) activeServices.set(idOf(s), s);
  }
  const byGarment = new Map<string, GarmentEntry>();
  for (const c of Array.isArray(categories) ? categories : []) {
    if (!c || c.isActive === false || c.active === false || !c.name) continue;
    const serviceId = idOf(c.serviceId);
    const service = activeServices.get(serviceId);
    if (!service) continue;
    const garment = String(c.name).trim();
    const key = garment.toLowerCase();
    if (!byGarment.has(key)) byGarment.set(key, { garment, options: [] });
    byGarment.get(key)!.options.push({
      categoryId: idOf(c),
      serviceId,
      serviceName: service.name,
      price: Number(c.basePrice) || 0,
      unit: c.unit || 'item',
    });
  }
  const entries = [...byGarment.values()];
  entries.forEach((e) => e.options.sort((a, b) => a.serviceName.localeCompare(b.serviceName)));
  return entries.sort((a, b) => a.garment.localeCompare(b.garment));
}

export function findOption(catalogue: GarmentEntry[], categoryId: string): (GarmentOption & { garment: string }) | null {
  for (const entry of catalogue) {
    const opt = entry.options.find((o) => o.categoryId === categoryId);
    if (opt) return { ...opt, garment: entry.garment };
  }
  return null;
}

/** Add-ons that may be put on individual garments (scope 'item'), for a service. */
export function lineAddonsFor(addons: any[], serviceId?: string): any[] {
  return (Array.isArray(addons) ? addons : []).filter((a) => {
    if (!a || a.isActive === false || a.active === false || a.scope !== 'item') return false;
    const eligible: string[] = (a.eligibleServiceIds || []).map(idOf);
    return eligible.length === 0 || (!!serviceId && eligible.includes(serviceId));
  });
}

/** Add-ons charged once on the whole order (the original kind — no scope field). */
export function orderLevelAddons(addons: any[]): any[] {
  return (Array.isArray(addons) ? addons : []).filter(
    (a) => a && a.isActive !== false && a.active !== false && a.scope !== 'item'
  );
}

/**
 * ₦ per garment for a line add-on — mirrors Addon.resolveUnitPrice on the
 * server. A percentage add-on is unaffected by garmentPricing (it already
 * scales with the garment through lineUnitPrice); a fixed add-on may have a
 * per-garment override, e.g. "Stain Removal" costing more on a Bedsheet than
 * on a Shirt. `garmentName`/`serviceId` identify the line being priced.
 */
export function addonUnitPrice(
  addon: any,
  opts: number | { lineUnitPrice: number; garmentName?: string; serviceId?: string }
): number {
  const { lineUnitPrice, garmentName, serviceId } = typeof opts === 'number' ? { lineUnitPrice: opts, garmentName: undefined, serviceId: undefined } : opts;
  if (addon?.type === 'percentage') {
    return Math.round((lineUnitPrice || 0) * (Number(addon.value) || 0) / 100);
  }
  const overrides: any[] = Array.isArray(addon?.garmentPricing) ? addon.garmentPricing : [];
  const norm = (s: any) => String(s || '').trim().toLowerCase();
  const name = norm(garmentName);
  if (name && overrides.length) {
    const exact = overrides.find((o) => norm(o.garmentName) === name && o.serviceId && idOf(o.serviceId) === serviceId);
    if (exact) return Math.round(Number(exact.price) || 0);
    const byGarment = overrides.find((o) => norm(o.garmentName) === name && !o.serviceId);
    if (byGarment) return Math.round(Number(byGarment.price) || 0);
  }
  return Math.round(Number(addon?.value) || 0);
}

export interface LineEstimate {
  garment: string;
  serviceName: string;
  unitPrice: number;
  serviceTotal: number;
  addons: { addonId: string; name: string; quantity: number; unitPrice: number; total: number }[];
  addonsTotal: number;
  lineTotal: number;
  complete: boolean;
}

/** Preview of what the server will charge for one line. */
export function estimateLine(line: DraftLine, catalogue: GarmentEntry[], addons: any[]): LineEstimate {
  const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
  let garment = line.garment;
  let serviceName = '';
  let serviceId: string | undefined;
  let unitPrice = 0;
  let complete = false;

  if (line.manual) {
    garment = line.itemType?.trim() || 'Custom item';
    serviceName = line.serviceName?.trim() || '';
    unitPrice = Math.max(0, Math.round(Number(line.unitPrice) || 0));
    complete = !!line.itemType?.trim() && quantity > 0;
  } else {
    const opt = findOption(catalogue, line.categoryId);
    const keepsAgreed = !!line._id && line.agreedCategoryId === line.categoryId && line.agreedUnitPrice != null;
    if (opt) {
      garment = opt.garment;
      serviceName = opt.serviceName;
      serviceId = opt.serviceId;
      unitPrice = keepsAgreed ? line.agreedUnitPrice! : opt.price;
      complete = quantity > 0;
    } else if (keepsAgreed) {
      unitPrice = line.agreedUnitPrice!;
      complete = quantity > 0;
    }
  }

  const byId = new Map((Array.isArray(addons) ? addons : []).map((a) => [idOf(a), a]));
  const lineAddons = line.addons
    .filter((a) => a.quantity > 0)
    .map((a) => {
      const addon = byId.get(a.addonId);
      const agreed = line.agreedAddonPrices?.[a.addonId];
      const per = agreed != null && line.agreedCategoryId === line.categoryId
        ? agreed
        : addonUnitPrice(addon, { lineUnitPrice: unitPrice, garmentName: garment, serviceId });
      return { addonId: a.addonId, name: addon?.name || 'Add-on', quantity: a.quantity, unitPrice: per, total: per * a.quantity };
    });
  const serviceTotal = unitPrice * quantity;
  const addonsTotal = lineAddons.reduce((s, a) => s + a.total, 0);
  return { garment, serviceName, unitPrice, serviceTotal, addons: lineAddons, addonsTotal, lineTotal: serviceTotal + addonsTotal, complete };
}

/** A problem with a line that the server would reject, in the same words. */
export function lineProblem(line: DraftLine, index: number): string | null {
  const label = `Item ${index + 1}`;
  const q = Number(line.quantity);
  if (line.manual) {
    if (!line.itemType?.trim()) return `${label}: enter the item name`;
    if (!(Number(line.unitPrice) >= 0)) return `${label}: enter a price of 0 or more`;
  } else if (!line.categoryId) {
    return `${label}: choose ${line.garment ? 'a service' : 'an item'}`;
  }
  if (!Number.isInteger(q) || q < 1) return `${label}: quantity must be a whole number of at least 1`;
  if ((line.readyQuantity || 0) > q) {
    return `${label}: ${line.readyQuantity} are already marked ready, so the quantity can't go below that`;
  }
  for (const a of line.addons) {
    if (a.quantity > q) return `${label}: an add-on can apply to at most ${q} garment(s)`;
    if (!Number.isInteger(a.quantity) || a.quantity < 1) return `${label}: add-on quantity must be at least 1`;
  }
  return null;
}

/** Request payload for one line — ids and quantities only; the server prices it. */
export function linePayload(line: DraftLine) {
  const base: Record<string, unknown> = {
    ...(line._id ? { _id: line._id } : {}),
    quantity: Number(line.quantity),
    addons: line.addons.filter((a) => a.quantity > 0).map((a) => ({ addonId: a.addonId, quantity: a.quantity })),
    ...(line.notes.trim() ? { notes: line.notes.trim() } : {}),
  };
  if (line.manual) {
    return {
      ...base,
      itemType: line.itemType?.trim(),
      serviceName: line.serviceName?.trim() || undefined,
      unitPrice: Math.max(0, Math.round(Number(line.unitPrice) || 0)),
    };
  }
  return { ...base, categoryId: line.categoryId };
}

/** Turn an existing order's lines into editable drafts. */
export function draftsFromOrder(order: any, catalogue: GarmentEntry[]): DraftLine[] {
  return (order?.items || []).map((item: any) => {
    const categoryId = item.categoryId ? String(item.categoryId) : '';
    const opt = categoryId ? findOption(catalogue, categoryId) : null;
    const manual = !categoryId;
    return {
      key: newLineKey(),
      _id: item._id ? String(item._id) : undefined,
      garment: manual ? CUSTOM_GARMENT : (opt?.garment || item.categoryName || item.itemType || ''),
      categoryId,
      quantity: item.quantity || 1,
      addons: (item.addons || []).map((a: any) => ({ addonId: idOf(a.addonId), quantity: a.quantity || 1 })),
      notes: item.notes || '',
      manual,
      itemType: manual ? item.itemType : undefined,
      serviceName: manual ? (item.serviceName || item.serviceType || '') : undefined,
      unitPrice: manual ? item.unitPrice : undefined,
      readyQuantity: item.readyQuantity || 0,
      collectedQuantity: item.collectedQuantity || 0,
      agreedCategoryId: categoryId || undefined,
      agreedUnitPrice: item.unitPrice,
      agreedAddonPrices: Object.fromEntries((item.addons || []).map((a: any) => [idOf(a.addonId), a.unitPrice || 0])),
    } as DraftLine;
  });
}

// ── Display helpers (orders as returned by the API) ─────────────────────────

/** "Wash & Iron" for catalogue lines; care-type keys on older lines. */
const CARE_TYPE_LABELS: Record<string, string> = {
  'wash-fold': 'Wash & Fold',
  'wash-iron': 'Wash & Iron',
  'iron-only': 'Iron Only',
  'dry-clean': 'Dry Clean',
};

export function lineServiceLabel(item: any): string {
  if (item?.serviceName && item.serviceName !== 'laundry') return item.serviceName;
  const t = item?.serviceType;
  if (!t || t === 'laundry') return '';
  return CARE_TYPE_LABELS[t] ?? String(t).replace(/-/g, ' ');
}

/** Total add-ons for a line as stored on the order (older lines have none). */
export const lineAddonsTotal = (item: any) =>
  item?.addonsTotal ?? (item?.addons || []).reduce((s: number, a: any) => s + (a.total || 0), 0);

export const lineServiceTotal = (item: any) => item?.total ?? (item?.unitPrice || 0) * (item?.quantity || 1);

export const garmentCount = (items: any[]) =>
  (Array.isArray(items) ? items : []).reduce((s, i) => s + (Number(i?.quantity) || 0), 0);

export const naira = (n: number) => `₦${(Math.round(n || 0)).toLocaleString()}`;

export interface AddonSummaryRow {
  addonId: string;
  name: string;
  /** Garments across the whole order receiving this add-on — never confused with its price */
  quantity: number;
  /** Money charged for it, summed across every line (may differ by garment) */
  total: number;
  /** true when this add-on priced differently on at least two lines */
  variesByLine: boolean;
}

/**
 * Aggregates per-garment add-ons across every line of an order into one row
 * per add-on — "Stain Removal: 2 garments, ₦1,500" — WITHOUT losing the
 * underlying per-line allocation, which stays on order.items[].addons[] and
 * is what this is derived from. Never store this aggregate; always recompute
 * it from the per-line records, which remain the single source of truth.
 */
export function addonSummary(items: any[]): AddonSummaryRow[] {
  const rows = new Map<string, AddonSummaryRow & { prices: Set<number> }>();
  for (const item of Array.isArray(items) ? items : []) {
    for (const a of item?.addons || []) {
      const id = idOf(a.addonId) || a.name;
      const existing = rows.get(id);
      const unitPrice = Number(a.unitPrice) || 0;
      const total = a.total != null ? Number(a.total) : unitPrice * (Number(a.quantity) || 0);
      if (existing) {
        existing.quantity += Number(a.quantity) || 0;
        existing.total += total;
        existing.prices.add(unitPrice);
      } else {
        rows.set(id, {
          addonId: id, name: a.name || 'Add-on', quantity: Number(a.quantity) || 0, total,
          variesByLine: false, prices: new Set([unitPrice]),
        });
      }
    }
  }
  return [...rows.values()]
    .map(({ prices, ...r }) => ({ ...r, variesByLine: prices.size > 1 }))
    .sort((a, b) => b.total - a.total);
}

// ── Garment progress ─────────────────────────────────────────────────────────

export const FULFILMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  processing: {
    label: 'Processing',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
  },
  partially_ready: {
    label: 'Partially ready',
    className: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
  },
  ready: {
    label: 'All ready',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  partially_collected: {
    label: 'Partially collected',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  },
  collected: {
    label: 'All collected',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  },
};

/**
 * The garment picture of an order. Uses the server's summary when present;
 * otherwise (an older API) derives it the same way the server does.
 */
export function fulfilmentOf(order: any) {
  if (order?.fulfilment) return order.fulfilment;
  const items: any[] = order?.items || [];
  const tracked = !!order?.itemTracking;
  const readyAll = ['ready', 'completed'].includes(order?.status);
  const collectedAll = order?.status === 'completed';
  const lines = items.map((i) => {
    const quantity = i.quantity || 0;
    const ready = tracked ? Math.min(i.readyQuantity || 0, quantity) : (readyAll ? quantity : 0);
    const collected = tracked ? Math.min(i.collectedQuantity || 0, ready) : (collectedAll ? quantity : 0);
    return {
      itemId: i._id, itemType: i.itemType, serviceName: i.serviceName, quantity, ready, collected,
      processing: quantity - ready, awaitingCollection: ready - collected, outstanding: quantity - collected,
    };
  });
  const sum = (k: 'quantity' | 'ready' | 'collected') => lines.reduce((s, l) => s + l[k], 0);
  const total = sum('quantity'); const ready = sum('ready'); const collected = sum('collected');
  let status = 'processing';
  if (order?.status === 'cancelled') status = 'cancelled';
  else if (total > 0 && collected >= total) status = 'collected';
  else if (collected > 0) status = 'partially_collected';
  else if (total > 0 && ready >= total) status = 'ready';
  else if (ready > 0) status = 'partially_ready';
  return {
    recorded: tracked, totalGarments: total, processingGarments: total - ready, readyGarments: ready,
    awaitingCollection: ready - collected, collectedGarments: collected, outstandingGarments: total - collected,
    status, lines,
  };
}

/** Short progress text for lists: "3/5 ready", "2/5 collected". */
export function fulfilmentShortLabel(order: any): string | null {
  const f = fulfilmentOf(order);
  if (!f.recorded || !f.totalGarments || f.status === 'cancelled') return null;
  if (f.status === 'partially_collected') return `${f.collectedGarments}/${f.totalGarments} collected`;
  if (f.status === 'partially_ready') return `${f.readyGarments}/${f.totalGarments} ready`;
  return null;
}
