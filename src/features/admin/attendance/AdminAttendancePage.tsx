// ============================================================================
// ADMIN ATTENDANCE PAGE - View & manage all staff attendance records
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Edit,
  MapPin,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

import { DataTable, DataTableColumnHeader } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { useAttendanceStore, AttendanceRecord } from '@/stores/useAttendanceStore';

// ============================================================================
// HELPERS
// ============================================================================

function staffName(record: AttendanceRecord): string {
  if (typeof record.userId === 'object') return record.userId.name;
  return '—';
}

function staffRole(record: AttendanceRecord): string {
  if (typeof record.userId === 'object') {
    return record.userId.staffRole || record.userId.role || '—';
  }
  return '—';
}

function hoursWorked(record: AttendanceRecord): string {
  if (!record.clockOutAt) return 'Active';
  const mins = differenceInMinutes(new Date(record.clockOutAt), new Date(record.clockInAt));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function isTodayUTC(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10) === today;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'present' ? 'default'
    : status === 'late' ? 'secondary'
    : 'destructive';
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

// ============================================================================
// EDIT RECORD DIALOG
// ============================================================================

interface EditDialogProps {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<AttendanceRecord>) => Promise<void>;
}

function EditAttendanceDialog({ record, open, onOpenChange, onSave }: EditDialogProps) {
  const [clockIn, setClockIn]   = useState('');
  const [clockOut, setClockOut] = useState('');
  const [status, setStatus]     = useState('');
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (record) {
      setClockIn(record.clockInAt ? record.clockInAt.slice(0, 16) : '');
      setClockOut(record.clockOutAt ? record.clockOutAt.slice(0, 16) : '');
      setStatus(record.status);
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const payload: Partial<AttendanceRecord> = { status: status as AttendanceRecord['status'] };
      if (clockIn)  payload.clockInAt  = new Date(clockIn).toISOString();
      if (clockOut) payload.clockOutAt = new Date(clockOut).toISOString();
      await onSave(record._id, payload);
      toast.success('Attendance updated');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance Record</DialogTitle>
          <DialogDescription>
            Manually correct clock-in / clock-out times or status for{' '}
            <strong>{record ? staffName(record) : ''}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="att-clock-in">Clock In</Label>
            <Input
              id="att-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-clock-out">Clock Out</Label>
            <Input
              id="att-clock-out"
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="att-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COLUMN FACTORY
// ============================================================================

function buildColumns(onEdit: (record: AttendanceRecord) => void): ColumnDef<AttendanceRecord>[] {
  return [
    {
      id: 'staff',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Staff" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{staffName(row.original)}</div>
          <div className="text-xs text-muted-foreground capitalize">{staffRole(row.original)}</div>
        </div>
      ),
      accessorFn: (row) => staffName(row),
    },
    {
      accessorKey: 'clockInAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Clock In" />,
      cell: ({ row }) =>
        row.original.clockInAt
          ? format(new Date(row.original.clockInAt), 'MMM dd, yyyy HH:mm')
          : '—',
    },
    {
      accessorKey: 'clockOutAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Clock Out" />,
      cell: ({ row }) => {
        if (!row.original.clockOutAt) {
          return <Badge variant="secondary" className="text-xs">Still In</Badge>;
        }
        return format(new Date(row.original.clockOutAt), 'HH:mm');
      },
    },
    {
      id: 'hours',
      header: 'Hours',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{hoursWorked(row.original)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'autoClockOut',
      header: 'Auto Out',
      cell: ({ row }) =>
        row.original.autoClockOut ? (
          <Badge variant="destructive" className="text-xs">Auto</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'geofence',
      header: () => <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Location</span>,
      cell: ({ row }) => {
        const { geofenceValid, distanceFromLocation } = row.original;
        if (geofenceValid === undefined || geofenceValid === null) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex items-center gap-1">
            {geofenceValid ? (
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <ShieldX className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={`text-xs ${geofenceValid ? 'text-green-600' : 'text-destructive'}`}>
              {distanceFromLocation != null ? `${distanceFromLocation} m` : geofenceValid ? 'OK' : 'Outside'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ];
}

// ============================================================================
// ATTENDANCE MOBILE CARD
// ============================================================================

function AttendanceMobileCard({
  record,
  onEdit,
}: {
  record: AttendanceRecord;
  onEdit: (r: AttendanceRecord) => void;
}) {
  const name = staffName(record);
  const role = staffRole(record);
  const hours = hoursWorked(record);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={record.status} />
              {record.autoClockOut && (
                <Badge variant="destructive" className="text-xs">Auto</Badge>
              )}
              {record.geofenceValid === true && (
                <Badge variant="outline" className="text-xs gap-1 border-green-400 text-green-600">
                  <ShieldCheck className="h-3 w-3" />
                  {record.distanceFromLocation != null ? `${record.distanceFromLocation} m` : 'In Range'}
                </Badge>
              )}
              {record.geofenceValid === false && (
                <Badge variant="outline" className="text-xs gap-1 border-destructive text-destructive">
                  <ShieldX className="h-3 w-3" />
                  Outside Range
                </Badge>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                In:{' '}
                <span className="text-foreground font-medium">
                  {record.clockInAt ? format(new Date(record.clockInAt), 'HH:mm') : '—'}
                </span>
              </span>
              <span>
                Out:{' '}
                <span className="text-foreground font-medium">
                  {record.clockOutAt ? format(new Date(record.clockOutAt), 'HH:mm') : (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Still In</Badge>
                  )}
                </span>
              </span>
              <span>
                Hours: <span className="text-foreground font-medium tabular-nums">{hours}</span>
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={() => onEdit(record)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AdminAttendancePage() {
  const { records, total, isLoading, fetchAttendance, updateAttendance } = useAttendanceStore();

  const [activeTab, setActiveTab]     = useState<'today' | 'history'>('today');
  const [editRecord, setEditRecord]   = useState<AttendanceRecord | null>(null);
  const [editOpen, setEditOpen]       = useState(false);

  // History filters
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate]     = useState('');
  const [filterStatus, setFilterStatus]       = useState('all');

  // ── Load today's data on mount ──────────────────────────────────────────
  const loadToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetchAttendance({
      startDate: `${today}T00:00:00.000Z`,
      endDate:   `${today}T23:59:59.999Z`,
      limit: 200,
    });
  }, [fetchAttendance]);

  const loadHistory = useCallback(() => {
    fetchAttendance({
      startDate: filterStartDate ? `${filterStartDate}T00:00:00.000Z` : undefined,
      endDate:   filterEndDate   ? `${filterEndDate}T23:59:59.999Z`   : undefined,
      status:    filterStatus !== 'all' ? filterStatus : undefined,
      limit: 100,
    });
  }, [fetchAttendance, filterStartDate, filterEndDate, filterStatus]);

  useEffect(() => {
    if (activeTab === 'today') loadToday();
    else                        loadHistory();
  }, [activeTab, loadToday, loadHistory]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const todayRecords  = records.filter((r) => isTodayUTC(r.clockInAt));
  const presentToday  = todayRecords.filter((r) => r.status === 'present').length;
  const lateToday     = todayRecords.filter((r) => r.status === 'late').length;
  const stillIn       = todayRecords.filter((r) => !r.clockOutAt).length;
  const autoOuts      = todayRecords.filter((r) => r.autoClockOut).length;

  // ── Edit handler ──────────────────────────────────────────────────────────
  const handleEdit = (record: AttendanceRecord) => {
    setEditRecord(record);
    setEditOpen(true);
  };

  const columns = buildColumns(handleEdit);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading && records.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">Track staff clock-ins, clock-outs, and records</p>
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => activeTab === 'today' ? loadToday() : loadHistory()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{presentToday}</div>
            <p className="text-xs text-muted-foreground">On time arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lateToday}</div>
            <p className="text-xs text-muted-foreground">Late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Still Clocked In</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stillIn}</div>
            <p className="text-xs text-muted-foreground">Currently on duty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto Clock-outs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoOuts}</div>
            <p className="text-xs text-muted-foreground">System auto-logged out today</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'today' | 'history')}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="today" className="flex-1 sm:flex-none">Today</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">History</TabsTrigger>
        </TabsList>

        {/* ── TODAY TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Today's Attendance — {format(new Date(), 'EEEE, MMMM dd, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
                  ))
                ) : todayRecords.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center gap-2 py-10">
                    <Clock className="h-8 w-8 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No records for today</p>
                  </CardContent></Card>
                ) : todayRecords.map((r) => (
                  <AttendanceMobileCard key={r._id} record={r} onEdit={handleEdit} />
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={todayRecords}
                  searchKey="staff"
                  searchPlaceholder="Search by staff name…"
                  isLoading={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORY TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-3 sm:px-6">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadHistory} disabled={isLoading} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
                  ))
                ) : records.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center gap-2 py-10">
                    <Clock className="h-8 w-8 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No records found</p>
                  </CardContent></Card>
                ) : records.map((r) => (
                  <AttendanceMobileCard key={r._id} record={r} onEdit={handleEdit} />
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={records}
                  searchKey="staff"
                  searchPlaceholder="Search by staff name…"
                  isLoading={isLoading}
                />
              </div>

              {total > records.length && (
                <p className="text-xs text-muted-foreground text-right">
                  Showing {records.length} of {total} records
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ──────────────────────────────────────────────────── */}
      <EditAttendanceDialog
        record={editRecord}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={updateAttendance}
      />
    </div>
  );
}
