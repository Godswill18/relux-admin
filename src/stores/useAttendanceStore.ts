// ============================================================================
// ATTENDANCE STORE - Admin Attendance Management State
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AttendanceRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    role: string;
    staffRole?: string;
  } | string;
  shiftId?: {
    _id: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    shiftType?: string;
    status: string;
  } | null;
  clockInAt: string;
  clockOutAt?: string | null;
  source: 'app' | 'qr';
  status: 'present' | 'late' | 'absent';
  autoClockOut: boolean;
  ipAddress?: string;
  geoLat?: number;
  geoLng?: number;
  geoAccuracy?: number;
  distanceFromLocation?: number;
  geofenceValid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceFetchParams {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface AttendanceState {
  records: AttendanceRecord[];
  total: number;
  isLoading: boolean;
  error: string | null;

  fetchAttendance: (params?: AttendanceFetchParams) => Promise<void>;
  updateAttendance: (
    id: string,
    data: Partial<Pick<AttendanceRecord, 'clockInAt' | 'clockOutAt' | 'status' | 'shiftId' | 'autoClockOut'>>
  ) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  total: 0,
  isLoading: false,
  error: null,

  fetchAttendance: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/attendance', { params });
      const { attendance } = response.data.data;
      const total = response.data.pagination?.total ?? attendance.length;
      set({ records: Array.isArray(attendance) ? attendance : [], total, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch attendance',
        records: [],
        isLoading: false,
      });
    }
  },

  updateAttendance: async (id, data) => {
    const response = await apiClient.put(`/attendance/${id}`, data);
    const updated: AttendanceRecord = response.data.data.attendance;
    set((state) => ({
      records: state.records.map((r) => (r._id === id ? updated : r)),
    }));
  },
}));
