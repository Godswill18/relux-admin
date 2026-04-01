// ============================================================================
// SHIFTS PAGE - Shift Scheduling & Management (Maxy Grand style)
// ============================================================================

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Plus,
  Zap,
  ZapOff,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useShiftStore, Shift, CreateShiftData } from '@/stores/useShiftStore';
import { useStaffStore } from '@/stores/useStaffStore';
import { useHasPermission, useCurrentUser } from '@/stores/useAuthStore';
import { Permission } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ConfirmationDialogState {
  isOpen: boolean;
  type: 'delete' | 'activate' | 'deactivate' | null;
  shiftId: string | null;
  shiftName: string | null;
}

interface ShiftFormData {
  userId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'full-day' | 'custom';
  notes: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ShiftsPage() {
  const {
    shifts,
    isLoading,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
    activateShift,
    deactivateShift,
  } = useShiftStore();

  const { staff, fetchStaff } = useStaffStore();
  const canManageShifts = useHasPermission(Permission.MANAGE_SHIFTS);
  const currentUser = useCurrentUser();
  // Only admin sees all shifts — manager, receptionist, and staff each see only their own
  const isAdmin = (currentUser?.role as string)?.toLowerCase() === 'admin';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmationDialogState>({
    isOpen: false,
    type: null,
    shiftId: null,
    shiftName: null,
  });

  // Form data
  const [formData, setFormData] = useState<ShiftFormData>({
    userId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '17:00',
    shiftType: 'custom',
    notes: '',
  });

  useEffect(() => {
    // Non-admins fetch only their own shifts; admins fetch all
    if (!isAdmin && currentUser?.id) {
      fetchShifts({ userId: currentUser.id });
    } else {
      fetchShifts();
    }
    fetchStaff();

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchShifts, fetchStaff, isAdmin, currentUser?.id]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const safeFormatDate = (
    dateString: any,
    formatString: string,
    fallback: string = 'Invalid Date'
  ): string => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (!isValid(date)) return fallback;
      return format(date, formatString);
    } catch {
      return fallback;
    }
  };

  const hasValidDates = (shift: any): boolean => {
    return !!(shift.startDate && shift.endDate);
  };

  const validShifts = (Array.isArray(shifts) ? shifts : []).filter(hasValidDates);

  // Staff can only see their own shifts
  const myShifts = !isAdmin
    ? validShifts.filter((shift) => {
        const shiftUserId = typeof shift.userId === 'object' ? shift.userId?._id : shift.userId;
        return shiftUserId === currentUser?.id;
      })
    : validShifts;

  // Filter logic (staff only filter by date; admins can also filter by staff member)
  const filteredShifts = myShifts.filter((shift) => {
    if (filterDate) {
      const filterDateStr = format(filterDate, 'yyyy-MM-dd');
      const shiftStartDate = safeFormatDate(shift.startDate, 'yyyy-MM-dd', '');
      const shiftEndDate = safeFormatDate(shift.endDate, 'yyyy-MM-dd', '');
      if (!shiftStartDate || !shiftEndDate || filterDateStr < shiftStartDate || filterDateStr > shiftEndDate) {
        return false;
      }
    }

    if (isAdmin && filterStaff !== 'all') {
      const userId = typeof shift.userId === 'object' ? shift.userId?._id : shift.userId;
      return userId === filterStaff;
    }

    return true;
  });

  // Set of all dates covered by the staff's own shifts (for calendar highlighting)
  const shiftDays = useMemo(() => {
    const days = new Set<string>();
    myShifts.forEach((shift) => {
      try {
        const start = new Date(shift.startDate);
        const end = new Date(shift.endDate);
        const cur = new Date(start);
        while (cur <= end) {
          days.add(format(cur, 'yyyy-MM-dd'));
          cur.setDate(cur.getDate() + 1);
        }
      } catch {}
    });
    return days;
  }, [myShifts]);

  // Stats (based on the shifts the current user is allowed to see)
  const stats = {
    total: myShifts.length,
    today: myShifts.filter((shift) => {
      const todayStr = format(currentTime, 'yyyy-MM-dd');
      return (
        safeFormatDate(shift.startDate, 'yyyy-MM-dd', '') <= todayStr &&
        safeFormatDate(shift.endDate, 'yyyy-MM-dd', '') >= todayStr
      );
    }).length,
    week: myShifts.filter((shift) => {
      const startOfWeek = new Date(currentTime);
      startOfWeek.setDate(currentTime.getDate() - currentTime.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const shiftStart = new Date(safeFormatDate(shift.startDate, 'yyyy-MM-dd', ''));
      const shiftEnd = new Date(safeFormatDate(shift.endDate, 'yyyy-MM-dd', ''));
      return shiftStart <= endOfWeek && shiftEnd >= startOfWeek;
    }).length,
    shiftTime: myShifts.filter((shift) => shift.isActive).length,
    emergencyActive: myShifts.filter((shift) => shift.emergencyActivated).length,
    offShift: myShifts.filter(
      (shift) =>
        !shift.isActive &&
        typeof shift.userId === 'object' &&
        shift.userId?.isActive !== false
    ).length,
    deactivated: myShifts.filter(
      (shift) => typeof shift.userId === 'object' && shift.userId?.isActive === false
    ).length,
  };

  // Get staff name from shift
  const getStaffName = (userId: Shift['userId']): string => {
    if (typeof userId === 'object' && userId !== null) {
      return userId.name || 'Unknown';
    }
    return String(userId);
  };

  const getStaffRole = (userId: Shift['userId']): string => {
    if (typeof userId === 'object' && userId !== null) {
      return userId.staffRole || userId.role || '';
    }
    return '';
  };

  // Status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-green-500 animate-pulse';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isMultiDayShift = (shift: Shift) => {
    if (!hasValidDates(shift)) return false;
    return safeFormatDate(shift.startDate, 'yyyy-MM-dd', '') !== safeFormatDate(shift.endDate, 'yyyy-MM-dd', '');
  };

  const getShiftDuration = (shift: Shift) => {
    if (!hasValidDates(shift)) return 'N/A';
    const start = new Date(shift.startDate);
    const end = new Date(shift.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0 || diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  // Filter staff for select (exclude admin/manager)
  const staffUsers = (Array.isArray(staff) ? staff : []).filter(
    (s: any) => s.role === 'staff' || s.staffRole
  );

  // ============================================================================
  // CONFIRMATION DIALOG
  // ============================================================================

  const openConfirmDialog = (
    type: 'delete' | 'activate' | 'deactivate',
    shiftId: string,
    shiftName: string
  ) => {
    setConfirmDialog({ isOpen: true, type, shiftId, shiftName });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, type: null, shiftId: null, shiftName: null });
  };

  const handleConfirmedAction = async () => {
    if (!confirmDialog.shiftId || !confirmDialog.type) return;
    try {
      switch (confirmDialog.type) {
        case 'delete':
          await deleteShift(confirmDialog.shiftId);
          toast.success('Shift deleted successfully');
          break;
        case 'activate':
          await activateShift(confirmDialog.shiftId);
          toast.success('Shift activated! Staff can now login at any time.');
          break;
        case 'deactivate':
          await deactivateShift(confirmDialog.shiftId);
          toast.success('Emergency activation removed. Normal schedule applies.');
          break;
      }
      closeConfirmDialog();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${confirmDialog.type} shift`);
    }
  };

  const getConfirmDialogContent = () => {
    switch (confirmDialog.type) {
      case 'delete':
        return {
          title: 'Delete Shift',
          description: `Are you sure you want to delete the shift for ${confirmDialog.shiftName}? This action cannot be undone.`,
          actionText: 'Delete',
          actionClass: 'bg-red-600 hover:bg-red-700',
        };
      case 'activate':
        return {
          title: 'Emergency Activate Shift',
          description: `Emergency activate shift for ${confirmDialog.shiftName}? The staff member will be able to login immediately, bypassing the scheduled time restrictions.`,
          actionText: 'Activate',
          actionClass: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'deactivate':
        return {
          title: 'Remove Emergency Activation',
          description: `Remove emergency activation for ${confirmDialog.shiftName}? The shift will return to normal schedule. If the current time is outside the scheduled hours, the staff member will be logged out.`,
          actionText: 'Deactivate',
          actionClass: 'bg-orange-600 hover:bg-orange-700',
        };
      default:
        return { title: '', description: '', actionText: '', actionClass: '' };
    }
  };

  const dialogContent = getConfirmDialogContent();

  // ============================================================================
  // CREATE / EDIT HANDLERS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      userId: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: format(new Date(), 'yyyy-MM-dd'),
      endTime: '17:00',
      shiftType: 'custom',
      notes: '',
    });
  };

  const handleCreateShift = async () => {
    if (!formData.userId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      const payload: CreateShiftData = {
        userId: formData.userId,
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate,
        endTime: formData.endTime,
        shiftType: formData.shiftType,
        notes: formData.notes || undefined,
      };
      await createShift(payload);
      toast.success('Shift created successfully. It will auto-activate daily at start time.');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to create shift');
    }
  };

  const handleUpdateShift = async () => {
    if (!selectedShift) return;
    if (!formData.userId || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast.error('Please fill all required fields');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    if (endDate < startDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      await updateShift(selectedShift._id || selectedShift.id, {
        userId: formData.userId,
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate,
        endTime: formData.endTime,
        shiftType: formData.shiftType,
        notes: formData.notes || undefined,
      });
      toast.success('Shift updated successfully');
      setIsEditDialogOpen(false);
      setSelectedShift(null);
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Failed to update shift');
    }
  };

  const openEditDialog = (shift: Shift) => {
    if (!hasValidDates(shift)) {
      toast.error('Cannot edit shift with invalid dates. Please delete and recreate.');
      return;
    }
    setSelectedShift(shift);
    setFormData({
      userId: typeof shift.userId === 'object' ? shift.userId?._id : shift.userId || '',
      startDate: safeFormatDate(shift.startDate, 'yyyy-MM-dd', format(new Date(), 'yyyy-MM-dd')),
      startTime: shift.startTime || '09:00',
      endDate: safeFormatDate(shift.endDate, 'yyyy-MM-dd', format(new Date(), 'yyyy-MM-dd')),
      endTime: shift.endTime || '17:00',
      shiftType: shift.shiftType || 'custom',
      notes: shift.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // ============================================================================
  // RENDER: SHIFT FORM (shared by create & edit)
  // ============================================================================

  const renderShiftForm = () => (
    <div className="space-y-4">
      <div>
        <Label>Staff Member *</Label>
        <Select value={formData.userId} onValueChange={(v) => setFormData({ ...formData, userId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {(Array.isArray(staff) ? staff : []).map((s: any) => (
              <SelectItem key={s._id || s.id} value={s._id || s.id}>
                {s.name} ({s.staffRole || s.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date * (Shift begins)</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div>
          <Label>End Date * (Shift ends)</Label>
          <Input
            type="date"
            value={formData.endDate}
            min={formData.startDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Time * (Daily activation)</Label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Staff can login from this time each day</p>
        </div>
        <div>
          <Label>End Time * (Daily deactivation)</Label>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Staff will be logged out at this time each day</p>
        </div>
      </div>

      <div>
        <Label>Shift Type</Label>
        <Select
          value={formData.shiftType}
          onValueChange={(v) => setFormData({ ...formData, shiftType: v as ShiftFormData['shiftType'] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select shift type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Morning</SelectItem>
            <SelectItem value="afternoon">Afternoon</SelectItem>
            <SelectItem value="evening">Evening</SelectItem>
            <SelectItem value="night">Night</SelectItem>
            <SelectItem value="full-day">Full Day</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Add any additional notes..."
          rows={3}
        />
      </div>
    </div>
  );

  // ============================================================================
  // CALENDAR (staff view — shows only their own shift days)
  // ============================================================================

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const selectedStr = filterDate ? format(filterDate, 'yyyy-MM-dd') : '';

    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            My Shift Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              className="p-1 rounded hover:bg-muted"
              onClick={() => setCalendarMonth(new Date(year, month - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{format(calendarMonth, 'MMMM yyyy')}</span>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted"
              onClick={() => setCalendarMonth(new Date(year, month + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd');
              const isShiftDay = shiftDays.has(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setFilterDate(isSelected ? null : new Date(year, month, day))}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full text-xs flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-bold'
                      : isShiftDay
                      ? 'bg-primary/20 text-primary font-semibold hover:bg-primary/30'
                      : 'text-muted-foreground hover:bg-muted',
                    isToday && !isSelected && 'ring-1 ring-primary'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-primary/20 inline-block" />
              Shift day
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full ring-1 ring-primary inline-block" />
              Today
            </span>
            {filterDate && (
              <button
                type="button"
                className="ml-auto text-primary underline"
                onClick={() => setFilterDate(null)}
              >
                Clear filter
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header with Current Time */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{!isAdmin ? 'My Shifts' : 'Shift Scheduler'}</h1>
          <p className="text-muted-foreground">
            {!isAdmin ? 'Your scheduled work shifts' : 'Manage staff shifts and schedules'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">
              Current Time: {format(currentTime, 'PPP p')}
            </span>
          </div>
        </div>
        {canManageShifts && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      {/* Invalid shifts warning */}
      {shifts.length !== validShifts.length && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                  {shifts.length - validShifts.length} shift(s) have invalid dates
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  These shifts have an old data format. Please delete them and create new ones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-activation info — admin/manager only */}
      {isAdmin && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700 dark:text-blue-300">Automatic Daily Activation</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Shifts automatically activate and deactivate daily at the specified start/end times.
                  For multi-day shifts, the times apply to each day in the duration. Emergency
                  activation overrides this schedule.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shift Calendar — staff only */}
      {!isAdmin && renderCalendar()}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.today}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{stats.week}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Within Shift Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.shiftTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Can login now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Emergency Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.emergencyActive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Off Shift</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.offShift}</div>
            <p className="text-xs text-muted-foreground mt-1">Outside shift hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deactivated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deactivated}</div>
            <p className="text-xs text-muted-foreground mt-1">Account disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Status System Info — admin/manager only */}
      {isAdmin && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-700 dark:text-blue-300">Dual Status System</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  <strong>Account Status (isActive):</strong> Manually controlled by admins in Staff
                  Management. When deactivated, staff cannot login at all.
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  <strong>Shift Time (isActive):</strong> Automatically controlled by the shift system.
                  Staff can only login during their scheduled shift hours. Updates daily at start/end
                  times.
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  <strong>Both must be true</strong> for staff to login (except admin/manager who are
                  always allowed).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Filter by Date</Label>
              <Input
                type="date"
                value={filterDate ? format(filterDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilterDate(e.target.value ? new Date(e.target.value) : null)}
              />
            </div>
            {isAdmin && (
              <div>
                <Label>Filter by Staff</Label>
                <Select value={filterStaff} onValueChange={setFilterStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {(Array.isArray(staff) ? staff : []).map((s: any) => (
                      <SelectItem key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.staffRole || s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterDate(null);
                  setFilterStaff('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts List (Card-based) */}
      <Card>
        <CardHeader>
          <CardTitle>
            {!isAdmin ? 'My Shifts' : 'All Shifts'} ({filteredShifts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading shifts...</div>
          ) : filteredShifts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {!isAdmin ? 'No shifts assigned to you yet.' : 'No shifts found. Create your first shift to get started.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShifts.map((shift) => {
                const shiftId = shift._id || shift.id;
                const staffName = getStaffName(shift.userId);
                const staffRole = getStaffRole(shift.userId);
                const userObj = typeof shift.userId === 'object' ? shift.userId : null;

                return (
                  <div
                    key={shiftId}
                    className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
                      shift.emergencyActivated
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                        : ''
                    }`}
                  >
                    {/* Header: Name, badges, actions */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{staffName}</h3>
                          {staffRole && <Badge variant="outline">{staffRole}</Badge>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Status badge */}
                          <Badge className={getStatusBadgeColor(shift.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(shift.status)}
                              {shift.status}
                            </span>
                          </Badge>

                          {/* isActive badge (Shift System) */}
                          {shift.isActive ? (
                            <Badge className="bg-green-500 animate-pulse">
                              <Clock className="h-3 w-3 mr-1" />
                              Within Shift Time
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              Off Shift
                            </Badge>
                          )}

                          {/* Emergency activated badge */}
                          {shift.emergencyActivated && (
                            <Badge className="bg-orange-500">
                              <Zap className="h-3 w-3 mr-1" />
                              Emergency Activated
                            </Badge>
                          )}

                          {/* Account deactivated badge */}
                          {userObj?.isActive === false && (
                            <Badge className="bg-red-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Account Deactivated
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {canManageShifts && (
                        <div className="flex gap-2 flex-wrap">
                          {shift.emergencyActivated ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openConfirmDialog('deactivate', shiftId, staffName)
                              }
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              title="Remove emergency activation"
                            >
                              <ZapOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openConfirmDialog('activate', shiftId, staffName)
                              }
                              className="text-orange-600 border-orange-600 hover:bg-orange-50"
                              title="Emergency activate (allow immediate login)"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfirmDialog('delete', shiftId, staffName)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Shift details grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <span className="flex items-center gap-1">
                        <span>Start:</span>{' '}
                        {safeFormatDate(shift.startDate, 'PPP', 'Invalid Date')}
                      </span>
                      {isMultiDayShift(shift) && (
                        <span className="flex items-center gap-1">
                          <span>End:</span>{' '}
                          {safeFormatDate(shift.endDate, 'PPP', 'Invalid Date')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span>Time:</span> {shift.startTime} - {shift.endTime} (daily)
                      </span>
                      <span className="flex items-center gap-1">
                        <span>Duration:</span> {getShiftDuration(shift)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>Type:</span> {shift.shiftType}
                      </span>
                    </div>

                    {/* Emergency activation info */}
                    {shift.emergencyActivated && shift.emergencyActivatedBy && (
                      <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900 rounded-md">
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          <Zap className="h-3 w-3 inline mr-1" />
                          Emergency activated by{' '}
                          {typeof shift.emergencyActivatedBy === 'object'
                            ? shift.emergencyActivatedBy.name
                            : shift.emergencyActivatedBy}
                          {shift.emergencyActivatedAt &&
                            ` on ${safeFormatDate(shift.emergencyActivatedAt, 'PPP p', '')}`}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {shift.notes && (
                      <div className="mt-3 p-2 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Notes: {shift.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* Confirmation AlertDialog */}
      {/* ================================================================ */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {dialogContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeConfirmDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedAction} className={dialogContent.actionClass}>
              {dialogContent.actionText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================ */}
      {/* Create Shift Dialog */}
      {/* ================================================================ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>
              Schedule a new shift for a staff member. Shift will auto-activate daily at start time
              and deactivate at end time.
            </DialogDescription>
          </DialogHeader>
          {renderShiftForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateShift} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* Edit Shift Dialog */}
      {/* ================================================================ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>Update shift details.</DialogDescription>
          </DialogHeader>
          {renderShiftForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedShift(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateShift} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
