// ============================================================================
// CAMPAIGNS — the "Relux Is One!" anniversary celebration. Superadmin
// (developer role) only; the backend enforces it. One global switch: every
// customer dashboard shows or hides the celebration together, live.
// ============================================================================

import { useEffect, useState } from 'react';
import { PartyPopper, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface Campaign {
  key: string; name: string; enabled: boolean; active: boolean;
  startsAt: string | null; endsAt: string | null;
  updatedAt: string | null; updatedBy: { id: string; name: string } | null;
}

const toInput = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function CampaignsTab() {
  const [c, setC] = useState<Campaign | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = async () => {
    setError('');
    try {
      const r = await apiClient.get('/settings/campaigns/anniversary');
      const d: Campaign = r.data.data;
      setC(d); setStartsAt(toInput(d.startsAt)); setEndsAt(toInput(d.endsAt));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not load the campaign.');
    }
  };
  useEffect(() => { load(); }, []);

  // The switch only moves once the server has saved the change.
  const save = async (enabled: boolean) => {
    if (!c) return;
    setSaving(true);
    try {
      const r = await apiClient.put('/settings/campaigns/anniversary', {
        enabled,
        startsAt: startsAt ? `${startsAt}T00:00:00+01:00` : null,
        endsAt: endsAt ? `${endsAt}T23:59:59+01:00` : null,
      });
      setC(r.data.data);
      toast.success(r.data.message);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'The change was not saved.');
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card><CardContent className="flex items-center justify-between gap-3 p-6 text-sm">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="mr-1 h-3.5 w-3.5" />Retry</Button>
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-amber-500" /> Anniversary Celebration Mode
        </CardTitle>
        <CardDescription>
          Shows the "Relux Is One!" celebration on every customer dashboard. Customers can't turn it off; changes reach open dashboards straight away.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!c ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Badge variant="outline" className={c.enabled ? 'border-0 bg-green-500/15 text-green-600' : 'border-0 bg-muted text-muted-foreground'}>
                    {c.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {c.enabled && !c.active && <span className="text-xs text-amber-600">Enabled, but outside its date range — customers don't see it now.</span>}
                </div>
              </div>
              <Switch checked={c.enabled} disabled={saving} onCheckedChange={save} aria-label="Anniversary Celebration Mode" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="camp-start">Starts (optional)</Label>
                <Input id="camp-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="camp-end">Ends (optional)</Label>
                <Input id="camp-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {c.updatedAt
                  ? <>Last updated {format(new Date(c.updatedAt), 'd MMM yyyy, h:mm a')}{c.updatedBy ? <> by <strong>{c.updatedBy.name}</strong></> : null}</>
                  : 'Never changed — off by default.'}
              </p>
              <Button size="sm" variant="outline" disabled={saving} onClick={() => save(c.enabled)}>Save dates</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
