// ============================================================================
// SERVICE LEVEL TIMER SETTINGS — how long each service level (Standard,
// Express, Premium Express …) promises to take, counted from confirmation.
//
// The price percentage on each level is shown for reference only; it is edited
// in Services & Pricing → Service Levels and is never used by the timer.
// Only the Superadmin (or a role they have granted the Service SLA permission)
// can change these — the server enforces it. A change applies to orders
// confirmed afterwards; orders already confirmed keep their deadline.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Timer, Info } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatDue } from '@/lib/sla';

interface LevelRow {
  serviceLevelId: string;
  name: string;
  percentageAdjustment: number;
  active: boolean;
  hours: number | null;
  updatedAt: string | null;
  updatedBy: { id: string; name: string } | null;
}
interface Config {
  canEdit: boolean;
  dueSoonFraction: number;
  limits: { minHours: number; maxHours: number };
  levels: LevelRow[];
}

const asInput = (h: number | null) => (h == null ? '' : String(h));

export function ServiceLevelTimersTab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get('/services/levels/sla');
      const data: Config = res.data.data;
      setConfig(data);
      setDraft(Object.fromEntries(data.levels.map((l) => [l.serviceLevelId, asInput(l.hours)])));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load service level timers');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = useMemo(
    () => (config?.levels || []).filter((l) => (draft[l.serviceLevelId] ?? '') !== asInput(l.hours)),
    [config, draft]
  );

  const save = async () => {
    if (!config || changed.length === 0) return;
    const levels = [];
    for (const l of changed) {
      const raw = (draft[l.serviceLevelId] ?? '').trim();
      if (raw === '') { levels.push({ serviceLevelId: l.serviceLevelId, hours: null }); continue; }
      const hours = Number(raw);
      if (!Number.isFinite(hours) || hours < config.limits.minHours || hours > config.limits.maxHours) {
        toast.error(`${l.name}: enter between ${config.limits.minHours} and ${config.limits.maxHours} hours`);
        return;
      }
      levels.push({ serviceLevelId: l.serviceLevelId, hours });
    }
    setSaving(true);
    try {
      const res = await apiClient.put('/services/levels/sla', { levels });
      toast.success(res.data?.message || 'Saved');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Service Level Timer Settings
        </CardTitle>
        <CardDescription>
          The promised processing time for each service level. The timer starts when an order is confirmed and
          does not restart when the order moves through washing, ironing or any other stage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !config ? null : (
          <>
            <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Changes apply to orders confirmed from now on — orders already confirmed keep the time they were promised.
                Leave a level empty for no timer.
                {' '}Orders are flagged “due soon” when {Math.round(config.dueSoonFraction * 100)}% or less of their time remains.
                {!config.canEdit && ' Only the Superadmin can change these.'}
              </p>
            </div>

            {config.levels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service levels yet. Add them in Services &amp; Pricing → Service Levels.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {config.levels.map((l) => (
                  <div key={l.serviceLevelId} className="grid gap-1.5 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`sla-${l.serviceLevelId}`} className="font-semibold">
                        {l.name}{l.percentageAdjustment > 0 ? ` (+${l.percentageAdjustment}%)` : ''}
                      </Label>
                      {!l.active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Processing time</p>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`sla-${l.serviceLevelId}`}
                        type="number" inputMode="decimal" step="0.5"
                        min={config.limits.minHours} max={config.limits.maxHours}
                        className="w-28" placeholder="No timer"
                        value={draft[l.serviceLevelId] ?? ''}
                        disabled={!config.canEdit}
                        onChange={(e) => setDraft((p) => ({ ...p, [l.serviceLevelId]: e.target.value }))}
                      />
                      <span className="text-sm text-muted-foreground">hours</span>
                    </div>
                    {l.updatedAt && (
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDue(l.updatedAt)}{l.updatedBy ? ` by ${l.updatedBy.name}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {config.canEdit && (
              <>
                <Separator />
                <Button onClick={save} disabled={saving || changed.length === 0}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
