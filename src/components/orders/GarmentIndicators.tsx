// ============================================================================
// GARMENT INDICATORS — counter view of open orders by where their garments
// are. Each chip filters the order list (GET /orders?fulfilment=…).
// ============================================================================

import { PackageCheck, Layers, PackageOpen } from 'lucide-react';

export type GarmentFilter = '' | 'ready_for_collection' | 'partially_ready' | 'partially_collected';

export interface GarmentStats {
  partiallyReady: number;
  readyForCollection: number;
  partiallyCollected: number;
  garmentsProcessing: number;
  garmentsAwaitingCollection: number;
  garmentsOutstanding: number;
}

export const GARMENT_FILTER_LABELS: Record<Exclude<GarmentFilter, ''>, string> = {
  ready_for_collection: 'Ready for collection',
  partially_ready: 'Partially ready',
  partially_collected: 'Partially collected',
};

/** Split a counts response into the per-status numbers and the garment stats. */
export function splitCounts(data: any): { counts: Record<string, number>; garments: GarmentStats | null } {
  const { fulfilment, ...rest } = data || {};
  const counts = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
  return { counts, garments: fulfilment || null };
}

export function GarmentIndicators({ stats, active, onSelect }: {
  stats: GarmentStats | null;
  active: GarmentFilter;
  onSelect: (filter: GarmentFilter) => void;
}) {
  if (!stats) return null;
  const chips: { key: Exclude<GarmentFilter, ''>; count: number; hint: string; Icon: typeof PackageCheck }[] = [
    {
      key: 'ready_for_collection', count: stats.readyForCollection, Icon: PackageCheck,
      hint: `${stats.garmentsAwaitingCollection} garment${stats.garmentsAwaitingCollection === 1 ? '' : 's'} waiting`,
    },
    { key: 'partially_ready', count: stats.partiallyReady, Icon: Layers, hint: 'some garments still processing' },
    {
      key: 'partially_collected', count: stats.partiallyCollected, Icon: PackageOpen,
      hint: 'rest still to be collected',
    },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(({ key, count, hint, Icon }) => {
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(on ? '' : key)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-colors ${
              on ? 'border-primary bg-primary/10' : 'bg-card hover:bg-muted/50'
            }`}
            aria-pressed={on}
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{count}</span> {GARMENT_FILTER_LABELS[key].toLowerCase()}
              <span className="block text-[11px] text-muted-foreground">{hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
