// ============================================================================
// STAFF ATTENDANCE PAGE - Clock In/Out · Today's Shift · Schedule Calendar
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  History,
  MapPin,
  Loader2,
  ShieldCheck,
  ShieldX,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { format, formatDuration, intervalToDuration, startOfMonth, differenceInDays } from 'date-fns';
import { useGeolocation, GeoPosition } from '@/hooks/useGeolocation';

// ============================================================================
// HELPERS
// ============================================================================

function hoursWorked(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return 'Ongoing';
  const duration = intervalToDuration({ start: new Date(clockIn), end: new Date(clockOut) });
  return formatDuration(duration, { format: ['hours', 'minutes'] }) || '< 1 min';
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shiftTimeRange(shift: any): string {
  if (!shift.startTime || !shift.endTime) return '—';
  const to12h = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${to12h(shift.startTime)} – ${to12h(shift.endTime)}`;
}

// ============================================================================
// LOCATION STATUS BADGE
// ============================================================================

type LocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'acquired'; position: GeoPosition }
  | { status: 'error'; message: string };

function LocationStatusCard({ state }: { state: LocationState }) {
  if (state.status === 'idle') return null;

  if (state.status === 'requesting') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-400">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        <span>Getting your GPS location…</span>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Location Error</p>
          <p className="text-xs mt-0.5 opacity-80">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.status === 'acquired') {
    const acc = state.position.accuracy;
    const isGoodAccuracy = acc <= 50;
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
          isGoodAccuracy
            ? 'border-green-200 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
            : 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
        }`}
      >
        <Navigation className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">Location acquired</p>
          <p className="text-xs opacity-70">
            {state.position.lat.toFixed(6)}, {state.position.lng.toFixed(6)} · Accuracy: ±{Math.round(acc)} m
          </p>
        </div>
        {isGoodAccuracy ? (
          <ShieldCheck className="h-4 w-4 shrink-0" />
        ) : (
          <ShieldX className="h-4 w-4 shrink-0" />
        )}
      </div>
    );
  }

  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StaffAttendancePage() {
  const [todayRecord, setTodayRecord]     = useState<any>(null);
  const [history, setHistory]             = useState<any[]>([]);
  const [shifts, setShifts]               = useState<any[]>([]);
  const [pageLoading, setPageLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>({ status: 'idle' });

  const { getLocation } = useGeolocation();

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const [attRes, shiftRes] = await Promise.all([
        apiClient.get('/attendance/me', { params: { limit: 10 } }),
        apiClient.get('/staff/shifts/me', { params: { startDate: monthStart } }),
      ]);

      const records: any[] = attRes.data.data?.attendance ?? attRes.data.data ?? [];
      const today = new Date();
      const todays = records.find((r: any) => isSameDay(new Date(r.clockInAt), today));
      setTodayRecord(todays ?? null);
      setHistory(records.filter((r: any) => !isSameDay(new Date(r.clockInAt), today)));

      const rawShifts: any[] = shiftRes.data.data?.shifts ?? shiftRes.data.data ?? [];
      setShifts(
        [...rawShifts].sort((a, b) => {
          const d = (a.startDate ?? '').localeCompare(b.startDate ?? '');
          return d !== 0 ? d : (a.startTime ?? '').localeCompare(b.startTime ?? '');
        })
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── GPS helper — request + validate ──────────────────────────────────────

  const acquireLocation = async (): Promise<GeoPosition | null> => {
    setLocationState({ status: 'requesting' });
    const result = await getLocation();

    if (result.error || !result.position) {
      setLocationState({ status: 'error', message: result.errorMessage ?? 'Could not get location.' });
      return null;
    }

    setLocationState({ status: 'acquired', position: result.position });
    return result.position;
  };

  // ── Clock In ──────────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const position = await acquireLocation();
      if (!position) {
        // Error already shown via locationState
        return;
      }

      const res = await apiClient.post('/attendance/clock-in', {
        geoLat: position.lat,
        geoLng: position.lng,
        geoAccuracy: position.accuracy,
      });

      if (res.data.success) {
        setTodayRecord(res.data.data.attendance);
        const dist = res.data.data.distance;
        toast.success(
          dist != null
            ? `Clocked in — ${dist} m from office`
            : 'Clocked in successfully!'
        );
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const msg  = err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to clock in';
      if (code === 'GEOFENCE_VIOLATION') {
        toast.error(msg, { duration: 6000 });
        // Keep locationState showing the acquired position so distance is visible
      } else {
        toast.error(msg);
        setLocationState({ status: 'idle' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Clock Out ─────────────────────────────────────────────────────────────

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const position = await acquireLocation();
      if (!position) return;

      const res = await apiClient.put('/attendance/clock-out', {
        geoLat: position.lat,
        geoLng: position.lng,
        geoAccuracy: position.accuracy,
      });

      if (res.data.success) {
        setTodayRecord(res.data.data.attendance);
        const dist = res.data.data.distance;
        toast.success(
          dist != null
            ? `Clocked out — ${dist} m from office`
            : 'Clocked out successfully!'
        );
        await loadData();
        setLocationState({ status: 'idle' });
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const msg  = err?.response?.data?.message || err?.response?.data?.error?.message || 'Failed to clock out';
      if (code === 'GEOFENCE_VIOLATION') {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
        setLocationState({ status: 'idle' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const today    = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const classifyShift = (s: any): 'today' | 'upcoming' | 'past' => {
    if (s.startDate <= todayStr && s.endDate >= todayStr) return 'today';
    if (s.startDate > todayStr) return 'upcoming';
    return 'past';
  };

  const scheduleShifts = shifts.filter((s: any) => s.endDate >= todayStr);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const isClockedOut = todayRecord && todayRecord.clockOutAt;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">{format(today, 'EEEE, MMMM dd, yyyy')}</p>
      </div>

      {/* ── Clock In / Out ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Today's Attendance
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3 w-3" />
            Your GPS location is verified before each clock action
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location status */}
          <LocationStatusCard state={locationState} />

          {!todayRecord ? (
            /* Not yet clocked in */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Not Clocked In</h3>
                <p className="text-sm text-muted-foreground">
                  You must be within the allowed work location to clock in
                </p>
              </div>
              <Button onClick={handleClockIn} disabled={actionLoading} size="lg" className="gap-2">
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {actionLoading ? 'Verifying location…' : 'Clock In'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Clock-in row */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <LogIn className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Clocked In</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(todayRecord.clockInAt), 'hh:mm a')}
                    </p>
                    {todayRecord.distanceFromLocation != null && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {todayRecord.distanceFromLocation} m from office
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="default">Present</Badge>
                  {todayRecord.geofenceValid === true && (
                    <Badge variant="outline" className="text-xs gap-1 border-green-400 text-green-600">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
              </div>

              {isClockedOut ? (
                /* Already clocked out */
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <LogOut className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Clocked Out</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(todayRecord.clockOutAt), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="secondary">Completed</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hoursWorked(todayRecord.clockInAt, todayRecord.clockOutAt)}
                    </p>
                  </div>
                </div>
              ) : (
                /* Still clocked in — show clock out button */
                <Button
                  onClick={handleClockOut}
                  disabled={actionLoading}
                  variant="destructive"
                  className="w-full gap-2"
                  size="lg"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  {actionLoading ? 'Verifying location…' : 'Clock Out'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Shift Schedule ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Shift Schedule
          </CardTitle>
          <CardDescription>
            {scheduleShifts.length === 0
              ? 'No shifts scheduled'
              : `${scheduleShifts.length} shift${scheduleShifts.length !== 1 ? 's' : ''} on your schedule`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduleShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No shifts have been assigned to you yet
            </p>
          ) : (
            <div className="space-y-3">
              {scheduleShifts.map((shift: any, i) => {
                const kind = classifyShift(shift);
                const isMultiDay = shift.startDate !== shift.endDate;
                const daySpan = isMultiDay
                  ? differenceInDays(
                      new Date(`${shift.endDate}T00:00:00`),
                      new Date(`${shift.startDate}T00:00:00`)
                    ) + 1
                  : 1;

                return (
                  <div
                    key={shift._id ?? i}
                    className={`rounded-lg border px-4 py-3 ${
                      kind === 'today' ? 'border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {kind === 'today' && (
                            <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
                              Today
                            </span>
                          )}
                          <p className="font-semibold text-sm">
                            {shift.startDate
                              ? format(new Date(`${shift.startDate}T00:00:00`), 'EEE, MMM dd, yyyy')
                              : '—'}
                            {isMultiDay && shift.endDate
                              ? ` – ${format(new Date(`${shift.endDate}T00:00:00`), 'EEE, MMM dd, yyyy')}`
                              : ''}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {shiftTimeRange(shift)}
                          {isMultiDay && (
                            <span className="text-xs text-muted-foreground/70">
                              · daily · {daySpan} days
                            </span>
                          )}
                        </p>
                        {shift.notes && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-xs">
                            {shift.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="capitalize text-xs">
                          {shift.shiftType ?? 'custom'}
                        </Badge>
                        {shift.status && (
                          <Badge
                            variant={kind === 'today' && shift.status === 'in-progress' ? 'default' : 'secondary'}
                            className="capitalize text-xs"
                          >
                            {shift.status}
                          </Badge>
                        )}
                        {shift.isActive && (
                          <Badge className="bg-green-500 text-white text-xs">Active now</Badge>
                        )}
                        {shift.emergencyActivated && (
                          <Badge className="bg-orange-500 text-white text-xs">Emergency</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Attendance History ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent History
          </CardTitle>
          <CardDescription>Your last attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No previous attendance records
            </p>
          ) : (
            <div className="space-y-0">
              {history.map((record: any, i) => (
                <div key={record._id ?? i}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {format(new Date(record.clockInAt), 'EEE, MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        In: {format(new Date(record.clockInAt), 'hh:mm a')}
                        {record.clockOutAt &&
                          ` · Out: ${format(new Date(record.clockOutAt), 'hh:mm a')}`}
                      </p>
                      {record.distanceFromLocation != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.distanceFromLocation} m from office
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {record.clockOutAt ? (
                        <Badge variant="secondary">
                          {hoursWorked(record.clockInAt, record.clockOutAt)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">No clock-out</Badge>
                      )}
                      {record.geofenceValid === true && (
                        <div className="flex justify-end">
                          <Badge variant="outline" className="text-[10px] gap-0.5 border-green-400 text-green-600">
                            <ShieldCheck className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
