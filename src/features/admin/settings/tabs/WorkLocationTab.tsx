// ============================================================================
// WORK LOCATION TAB — Geo-fenced Clock-In/Out Settings
// ============================================================================

import { useEffect, useState } from 'react';
import { MapPin, Save, Loader2, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight, Navigation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface WorkLocation {
  _id?: string;
  name: string;
  googleMapsLink?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  enabled: boolean;
  updatedAt?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkLocationTab() {
  const [location, setLocation] = useState<WorkLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedCoords, setParsedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Form state
  const [name, setName] = useState('Main Branch');
  const [mapsLink, setMapsLink] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('10');
  const [enabled, setEnabled] = useState(true);

  // ── Load saved location ─────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/work-location');
        const loc: WorkLocation | null = res.data.data?.location;
        if (loc) {
          setLocation(loc);
          setName(loc.name ?? 'Main Branch');
          setMapsLink(loc.googleMapsLink ?? '');
          setLat(String(loc.lat));
          setLng(String(loc.lng));
          setRadius(String(loc.radiusMeters ?? 10));
          setEnabled(loc.enabled ?? true);
        }
      } catch {
        toast.error('Failed to load work location settings');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Parse Google Maps link ──────────────────────────────────────────────

  const handleParseLink = async () => {
    if (!mapsLink.trim()) return;
    setIsParsing(true);
    setParsedCoords(null);
    try {
      const res = await apiClient.post('/work-location/parse-link', { googleMapsLink: mapsLink });
      const coords = res.data.data;
      setParsedCoords(coords);
      setLat(String(coords.lat));
      setLng(String(coords.lng));
      toast.success(`Coordinates extracted: ${coords.lat}, ${coords.lng}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not parse link');
    } finally {
      setIsParsing(false);
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseInt(radius, 10);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      toast.error('Valid latitude and longitude are required');
      return;
    }
    if (isNaN(parsedRadius) || parsedRadius < 1) {
      toast.error('Radius must be at least 1 metre');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.put('/work-location', {
        name: name.trim() || 'Main Branch',
        googleMapsLink: mapsLink.trim() || undefined,
        lat: parsedLat,
        lng: parsedLng,
        radiusMeters: parsedRadius,
        enabled,
      });
      setLocation(res.data.data.location);
      toast.success('Work location saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save work location');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const googleMapsPreviewUrl =
    lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : null;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card className={enabled ? 'border-green-200 bg-green-50/40 dark:bg-green-950/20' : 'border-muted'}>
        <CardContent className="flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-3">
            <Navigation className={`h-5 w-5 ${enabled ? 'text-green-600' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm font-semibold">
                Geo-Fenced Clock-In/Out is{' '}
                <span className={enabled ? 'text-green-600' : 'text-muted-foreground'}>
                  {enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {enabled
                  ? `Staff must be within ${radius} m of the pinned location to clock in or out`
                  : 'Staff can clock in/out from anywhere'}
              </p>
            </div>
          </div>
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => setEnabled((v) => !v)}
          >
            {enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {enabled ? 'Enabled' : 'Disabled'}
          </Button>
        </CardContent>
      </Card>

      {/* Configuration card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Work Location Configuration
          </CardTitle>
          <CardDescription>
            Set the GPS pin where staff must be present to clock in or out.
            Paste a Google Maps link to extract coordinates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Location Name */}
          <div className="space-y-1.5">
            <Label>Location Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Branch, Head Office"
            />
          </div>

          <Separator />

          {/* Google Maps link */}
          <div className="space-y-1.5">
            <Label>Google Maps Link</Label>
            <p className="text-xs text-muted-foreground">
              Open Google Maps, navigate to your location, click Share → Copy link, and paste it here.
            </p>
            <div className="flex gap-2">
              <Input
                value={mapsLink}
                onChange={(e) => { setMapsLink(e.target.value); setParsedCoords(null); }}
                placeholder="https://www.google.com/maps/@6.5244,3.3792,15z"
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={handleParseLink}
                disabled={isParsing || !mapsLink.trim()}
              >
                {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Extract'}
              </Button>
            </div>
            {parsedCoords && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Extracted: {parsedCoords.lat}, {parsedCoords.lng}
              </p>
            )}
          </div>

          <Separator />

          {/* Manual coordinates */}
          <div className="space-y-1.5">
            <Label>Coordinates</Label>
            <p className="text-xs text-muted-foreground">
              These are auto-filled when you extract from a Maps link, or enter manually.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <Input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="6.5244"
                  type="number"
                  step="0.000001"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <Input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="3.3792"
                  type="number"
                  step="0.000001"
                />
              </div>
            </div>
          </div>

          {/* Map preview link */}
          {googleMapsPreviewUrl && (
            <a
              href={googleMapsPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2"
            >
              <MapPin className="h-3 w-3" />
              Preview pinned location on Google Maps
            </a>
          )}

          <Separator />

          {/* Allowed radius */}
          <div className="space-y-1.5">
            <Label>Allowed Radius (metres)</Label>
            <p className="text-xs text-muted-foreground">
              Staff must be within this distance of the pinned location. Default: 10 m.
            </p>
            <div className="flex items-center gap-3">
              <Input
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                type="number"
                min="1"
                max="5000"
                className="w-32"
              />
              <div className="flex gap-2">
                {[10, 25, 50, 100].map((r) => (
                  <Button
                    key={r}
                    variant={radius === String(r) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setRadius(String(r))}
                  >
                    {r} m
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Warning */}
          {enabled && (!lat || !lng) && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Geo-fencing is enabled but no coordinates are set. Staff will not be able to clock in or out until
                a valid location is configured.
              </p>
            </div>
          )}

          {/* Last saved info */}
          {location?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated:{' '}
              {new Date(location.updatedAt).toLocaleString('en-NG', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Work Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50/40 dark:bg-blue-950/20">
        <CardContent className="py-4 px-6 space-y-2">
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            How Geo-Fencing Works
          </p>
          <ul className="text-xs text-blue-700/80 dark:text-blue-400/80 space-y-1 list-disc list-inside">
            <li>When staff tap Clock In or Clock Out, their device GPS location is captured.</li>
            <li>The backend calculates the exact distance from the pinned work location.</li>
            <li>If the staff member is outside the allowed radius, the action is blocked.</li>
            <li>GPS readings with accuracy worse than 100 m are also rejected to prevent spoofing.</li>
            <li>Every clock-in/out record stores the distance so admins can audit it.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
