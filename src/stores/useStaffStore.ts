// ============================================================================
// STAFF STORE - Staff Management State
// ============================================================================

import { create } from 'zustand';
import { Staff, StaffCompensation, Role } from '@/types';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface StaffFilters {
  role?: Role | 'all';
  status?: string;
  search?: string;
}

const PAGE_LIMIT = 20;

interface StaffState {
  // State
  staff: Staff[];
  selectedStaff: Staff | null;
  selectedCompensation: StaffCompensation | null;
  filters: StaffFilters;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  isLoadingCompensation: boolean;
  error: string | null;

  // Actions
  fetchStaff: () => Promise<void>;
  loadMoreStaff: () => Promise<void>;
  setSelectedStaff: (staff: Staff | null) => void;
  setFilters: (filters: Partial<StaffFilters>) => void;
  createStaff: (data: Partial<Staff>) => Promise<void>;
  updateStaff: (staffId: string, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (staffId: string) => Promise<void>;
  toggleStaffStatus: (staffId: string) => Promise<void>;
  fetchCompensation: (staffId: string) => Promise<void>;
  updateCompensation: (staffId: string, data: Partial<StaffCompensation>) => Promise<void>;
}

// Helper to get staff ID (backend returns _id, frontend uses id)
const getStaffId = (s: Staff) => (s as any)._id || s.id;

// ============================================================================
// STAFF STORE
// ============================================================================

export const useStaffStore = create<StaffState>((set, get) => ({
  // Initial state
  staff: [],
  selectedStaff: null,
  selectedCompensation: null,
  filters: {
    role: 'all',
    status: 'all',
    search: '',
  },
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  currentPage: 1,
  isLoadingCompensation: false,
  error: null,

  // Fetch staff (resets to page 1)
  fetchStaff: async () => {
    try {
      set({ isLoading: true, error: null, currentPage: 1, hasMore: false });

      const { filters } = get();
      const params: any = { page: 1, limit: PAGE_LIMIT };

      if (filters.role && filters.role !== 'all') params.role = filters.role;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/staff', { params });

      if (response.data.success) {
        const list = response.data.data || [];
        const pagination = response.data.pagination;
        set({
          staff: list,
          isLoading: false,
          currentPage: 1,
          hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
        });
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch staff');
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch staff', isLoading: false, hasMore: false });
    }
  },

  // Load next page and append
  loadMoreStaff: async () => {
    const { isFetchingMore, hasMore, currentPage, filters } = get();
    if (isFetchingMore || !hasMore) return;

    try {
      set({ isFetchingMore: true });
      const nextPage = currentPage + 1;
      const params: any = { page: nextPage, limit: PAGE_LIMIT };

      if (filters.role && filters.role !== 'all') params.role = filters.role;
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/staff', { params });

      if (response.data.success) {
        const list = response.data.data || [];
        const pagination = response.data.pagination;
        set((state) => ({
          staff: [...state.staff, ...list],
          currentPage: nextPage,
          hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
          isFetchingMore: false,
        }));
      } else {
        set({ isFetchingMore: false, hasMore: false });
      }
    } catch (error: any) {
      console.error('Error loading more staff:', error);
      set({ isFetchingMore: false });
    }
  },

  // Set selected staff
  setSelectedStaff: (staff) => {
    set({ selectedStaff: staff });
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchStaff();
  },

  // Create staff
  createStaff: async (data) => {
    try {
      const response = await apiClient.post('/staff', data);

      if (response.data.success) {
        await get().fetchStaff();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to create staff' });
      throw error;
    }
  },

  // Update staff
  updateStaff: async (staffId, data) => {
    try {
      const response = await apiClient.patch(`/staff/${staffId}`, data);

      if (response.data.success) {
        await get().fetchStaff();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update staff' });
      throw error;
    }
  },

  // Delete staff
  deleteStaff: async (staffId) => {
    try {
      const response = await apiClient.delete(`/staff/${staffId}`);

      if (response.data.success) {
        set((state) => ({
          staff: state.staff.filter((s) => getStaffId(s) !== staffId),
          selectedStaff: getStaffId(state.selectedStaff!) === staffId ? null : state.selectedStaff,
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete staff' });
      throw error;
    }
  },

  // Toggle staff status
  toggleStaffStatus: async (staffId) => {
    try {
      const staff = get().staff.find((s) => getStaffId(s) === staffId);
      if (!staff) return;

      await get().updateStaff(staffId, { isActive: !staff.isActive });
    } catch (error: any) {
      set({ error: error.message || 'Failed to toggle staff status' });
      throw error;
    }
  },

  // Fetch compensation for a staff member
  fetchCompensation: async (staffId) => {
    try {
      set({ isLoadingCompensation: true, selectedCompensation: null });
      const response = await apiClient.get(`/staff/${staffId}/compensation`);

      if (response.data.success) {
        set({
          selectedCompensation: response.data.data?.compensation || null,
          isLoadingCompensation: false,
        });
      }
    } catch {
      // Compensation may not exist yet — that's OK
      set({ selectedCompensation: null, isLoadingCompensation: false });
    }
  },

  // Update compensation for a staff member
  updateCompensation: async (staffId, data) => {
    try {
      const response = await apiClient.put(`/staff/${staffId}/compensation`, data);

      if (response.data.success) {
        set({ selectedCompensation: response.data.data?.compensation || null });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update compensation' });
      throw error;
    }
  },
}));
