// ============================================================================
// SHIFT STORE - Shift Scheduling State Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ShiftUser {
  _id: string;
  name: string;
  role: string;
  staffRole?: string;
  isActive?: boolean;
}

export interface Shift {
  _id: string;
  id: string;
  userId: ShiftUser | string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'full-day' | 'custom';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  isActive: boolean;
  notes?: string;
  createdBy?: { _id: string; name: string } | string;
  emergencyActivated?: boolean;
  emergencyActivatedBy?: { _id: string; name: string } | string;
  emergencyActivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftData {
  userId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  shiftType?: string;
  notes?: string;
}

interface ShiftState {
  shifts: Shift[];
  isLoading: boolean;
  error: string | null;

  fetchShifts: (params?: Record<string, string>) => Promise<void>;
  createShift: (data: CreateShiftData) => Promise<void>;
  updateShift: (shiftId: string, data: Partial<CreateShiftData>) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  activateShift: (shiftId: string) => Promise<void>;
  deactivateShift: (shiftId: string) => Promise<void>;
}

// ============================================================================
// SHIFT STORE
// ============================================================================

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  isLoading: false,
  error: null,

  fetchShifts: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/staff/shifts', { params });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.shifts || [];
        set({ shifts: list, isLoading: false });
      } else {
        set({ shifts: [], isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch shifts',
        shifts: [],
        isLoading: false,
      });
    }
  },

  createShift: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post('/staff/shifts', data);
      if (response.data.success) {
        await get().fetchShifts();
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create shift', isLoading: false });
      throw error;
    }
  },

  updateShift: async (shiftId, data) => {
    try {
      const response = await apiClient.put(`/staff/shifts/${shiftId}`, data);
      if (response.data.success) {
        await get().fetchShifts();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update shift' });
      throw error;
    }
  },

  deleteShift: async (shiftId) => {
    try {
      const response = await apiClient.delete(`/staff/shifts/${shiftId}`);
      if (response.data.success) {
        set((state) => ({
          shifts: state.shifts.filter((s) => (s._id || s.id) !== shiftId),
        }));
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete shift' });
      throw error;
    }
  },

  activateShift: async (shiftId) => {
    try {
      const response = await apiClient.put(`/staff/shifts/${shiftId}/activate`);
      if (response.data.success) {
        await get().fetchShifts();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to activate shift' });
      throw error;
    }
  },

  deactivateShift: async (shiftId) => {
    try {
      const response = await apiClient.put(`/staff/shifts/${shiftId}/deactivate`);
      if (response.data.success) {
        await get().fetchShifts();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to deactivate shift' });
      throw error;
    }
  },
}));
