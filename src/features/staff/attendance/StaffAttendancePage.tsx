// ============================================================================
// STAFF ATTENDANCE PAGE - Clock In/Out · Today's Shift · Schedule Calendar
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Clock, Calendar as CalendarIcon, LogIn, LogOut, History } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { format, formatDuration, intervalToDuration, startOfMonth, differenceInDays } from 'date-fns';

// ============================================================================
// HELPERS
// ============================================================================

function hoursWorked(clockIn: string, clockOut: string | null): string {
  if (!clockOut) return 'Ongoing';
  const duration = intervalToDuration({
    start: new Date(clockIn),
    end: new Date(clockOut),
  });
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
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${to12h(shift.startTime)} – ${to12h(shift.endTime)}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function StaffAttendancePage() {
  const [todayRecord, setTodayRecord]   = useState<any>(null);
  const [history, setHistory]           = useState<any[]>([]);
  const [shifts, setShifts]             = useState<any[]>([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      // Fetch from start of current month so the calendar shows full-month coverage.
      // Backend now filters endDate >= startDate param (so ongoing multi-day shifts
      // that started earlier are still returned).
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      const [attRes, shiftRes] = await Promise.all([
        apiClient.get('/attendance/me', { params: { limit: 10 } }),
        apiClient.get('/staff/shifts/me', { params: { startDate: monthStart } }),
      ]);

      // Attendance
      const records: any[] = attRes.data.data?.attendance ?? attRes.data.data ?? [];
      const today = new Date();
      const todays = records.find((r: any) => isSameDay(new Date(r.clockInAt), today));
      setTodayRecord(todays ?? null);
      setHistory(records.filter((r: any) => !isSameDay(new Date(r.clockInAt), today)));

      // Shifts: sort ascending so the nearest upcoming shift comes first
      const rawShifts: any[] = shiftRes.data.data?.shifts ?? shiftRes.data.data ?? [];
      const sorted = [...rawShifts].sort((a, b) => {
        const dateCmp = (a.startDate ?? '').localeCompare(b.startDate ?? '');
        if (dateCmp !== 0) return dateCmp;
        return (a.startTime ?? '').localeCompare(b.startTime ?? '');
      });
      setShifts(sorted);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Clock actions ─────────────────────────────────────────────────────────

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/clock-in');
      if (res.data.success) {
        setTodayRecord(res.data.data.attendance);
        toast.success('Clocked in successfully!');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.put('/attendance/clock-out');
      if (res.data.success) {
        setTodayRecord(res.data.data.attendance);
        toast.success('Clocked out successfully!');
        await loadData();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const today    = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Classify each shift relative to today for display
  const classifyShift = (s: any): 'today' | 'upcoming' | 'past' => {
    if (s.startDate <= todayStr && s.endDate >= todayStr) return 'today';
    if (s.startDate > todayStr) return 'upcoming';
    return 'past';
  };

  // All shifts sorted ascending — used for the full schedule list
  const scheduleShifts = shifts.filter((s: any) => s.endDate >= todayStr); // hide fully-past shifts

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
        <p className="text-muted-foreground">
          {format(today, 'EEEE, MMMM dd, yyyy')}
        </p>
      </div>

      {/* ── Clock In / Out ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!todayRecord ? (
            /* Not yet clocked in */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Not Clocked In</h3>
                <p className="text-sm text-muted-foreground">
                  Start your shift by clocking in
                </p>
              </div>
              <Button onClick={handleClockIn} disabled={actionLoading} size="lg">
                <LogIn className="mr-2 h-5 w-5" />
                Clock In
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
                  </div>
                </div>
                <Badge variant="default">Present</Badge>
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
                  className="w-full"
                  size="lg"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Clock Out
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Shift Schedule (detailed list) ────────────────────────────────── */}
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
                      kind === 'today'
                        ? 'border-primary bg-primary/5'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: date + time */}
                      <div className="space-y-1 min-w-0">
                        {/* Date row */}
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

                        {/* Time row */}
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {shiftTimeRange(shift)}
                          {isMultiDay && (
                            <span className="text-xs text-muted-foreground/70">
                              · daily · {daySpan} days
                            </span>
                          )}
                        </p>

                        {/* Notes */}
                        {shift.notes && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-xs">
                            {shift.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="capitalize text-xs">
                          {shift.shiftType ?? 'custom'}
                        </Badge>
                        {shift.status && (
                          <Badge
                            variant={
                              kind === 'today' && shift.status === 'in-progress'
                                ? 'default'
                                : 'secondary'
                            }
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
                    </div>
                    <div className="text-right">
                      {record.clockOutAt ? (
                        <Badge variant="secondary">
                          {hoursWorked(record.clockInAt, record.clockOutAt)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">No clock-out</Badge>
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
