// ============================================================================
// PAYROLL STORE - Payroll Scheduler State Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export type PayrollFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type PeriodStatus = 'draft' | 'approved' | 'finalized' | 'paid';
export type PaymentStatus = 'pending' | 'paid';

export interface PayrollPeriod {
  _id: string;
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  frequency: PayrollFrequency;
  status: PeriodStatus;
  staffIds: string[];
  totalAmount: number;
  createdBy?: { _id: string; name: string } | string;
  approvedBy?: { _id: string; name: string } | string;
  approvedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEntry {
  _id: string;
  id: string;
  periodId: string;
  userId:
    | { _id: string; name: string; email: string; role: string; staffRole?: string; phone?: string }
    | string;
  payType: 'hourly' | 'monthly';
  baseHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  basePay: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  totalPay: number;
  attendanceCount: number;
  lateCount: number;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntrySummary {
  totalEntries: number;
  totalAmount: number;
  totalBonuses: number;
  totalDeductions: number;
}

interface CreatePeriodData {
  name?: string;
  startDate: string;
  endDate: string;
  frequency?: PayrollFrequency;
  staffIds?: string[];
}

interface PayrollState {
  // State
  periods: PayrollPeriod[];
  entries: PayrollEntry[];
  entrySummary: EntrySummary | null;
  selectedPeriod: PayrollPeriod | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Actions
  fetchPeriods: (status?: string) => Promise<void>;
  createPeriod: (data: CreatePeriodData) => Promise<PayrollPeriod | null>;
  updatePeriod: (periodId: string, data: Partial<CreatePeriodData>) => Promise<void>;
  deletePeriod: (periodId: string) => Promise<void>;
  setSelectedPeriod: (period: PayrollPeriod | null) => void;
  fetchEntries: (periodId: string) => Promise<void>;
  generateEntries: (periodId: string) => Promise<void>;
  approvePeriod: (periodId: string) => Promise<void>;
  finalizePeriod: (periodId: string) => Promise<void>;
  markPeriodPaid: (periodId: string) => Promise<void>;
  updateEntry: (entryId: string, data: Partial<PayrollEntry>) => Promise<void>;
  generatePayslip: (entryId: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const usePayrollStore = create<PayrollState>((set, get) => ({
  periods: [],
  entries: [],
  entrySummary: null,
  selectedPeriod: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchPeriods: async (status) => {
    try {
      set({ isLoading: true, error: null });

      const params: Record<string, string> = {};
      if (status && status !== 'all') params.status = status;

      const response = await apiClient.get('/payroll/periods', { params });

      if (response.data.success) {
        const data = response.data.data;
        const periods = data.periods || data || [];
        set({ periods: Array.isArray(periods) ? periods : [], isLoading: false });
      } else {
        throw new Error('Failed to fetch payroll periods');
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch payroll periods',
        isLoading: false,
      });
    }
  },

  createPeriod: async (data) => {
    try {
      set({ error: null });

      const response = await apiClient.post('/payroll/periods', data);

      if (response.data.success) {
        const newPeriod = response.data.data.period;
        await get().fetchPeriods();
        return newPeriod;
      }
      return null;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to create period';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updatePeriod: async (periodId, data) => {
    try {
      const response = await apiClient.put(`/payroll/periods/${periodId}`, data);

      if (response.data.success) {
        await get().fetchPeriods();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update period' });
      throw error;
    }
  },

  deletePeriod: async (periodId) => {
    try {
      const response = await apiClient.delete(`/payroll/periods/${periodId}`);

      if (response.data.success) {
        const { selectedPeriod } = get();
        if (selectedPeriod && (selectedPeriod._id === periodId || selectedPeriod.id === periodId)) {
          set({ selectedPeriod: null, entries: [], entrySummary: null });
        }
        await get().fetchPeriods();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete period' });
      throw error;
    }
  },

  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period, entries: [], entrySummary: null });
    if (period) {
      get().fetchEntries(period._id || period.id);
    }
  },

  fetchEntries: async (periodId) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get(`/payroll/periods/${periodId}/entries`);

      if (response.data.success) {
        const data = response.data.data;
        const entries = data.entries || data || [];
        set({
          entries: Array.isArray(entries) ? entries : [],
          entrySummary: data.summary || null,
          isLoading: false,
        });
      } else {
        throw new Error('Failed to fetch entries');
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch entries',
        isLoading: false,
      });
    }
  },

  generateEntries: async (periodId) => {
    try {
      set({ isGenerating: true, error: null });

      const response = await apiClient.post(`/payroll/periods/${periodId}/generate`);

      if (response.data.success) {
        await get().fetchEntries(periodId);
        await get().fetchPeriods();
      }
      set({ isGenerating: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to generate entries',
        isGenerating: false,
      });
      throw error;
    }
  },

  approvePeriod: async (periodId) => {
    try {
      const response = await apiClient.put(`/payroll/periods/${periodId}/approve`);

      if (response.data.success) {
        await get().fetchPeriods();
        const { selectedPeriod } = get();
        if (selectedPeriod && (selectedPeriod._id === periodId || selectedPeriod.id === periodId)) {
          set({ selectedPeriod: { ...selectedPeriod, status: 'approved' } });
        }
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to approve period' });
      throw error;
    }
  },

  finalizePeriod: async (periodId) => {
    try {
      const response = await apiClient.put(`/payroll/periods/${periodId}/finalize`);

      if (response.data.success) {
        await get().fetchPeriods();
        const { selectedPeriod } = get();
        if (selectedPeriod && (selectedPeriod._id === periodId || selectedPeriod.id === periodId)) {
          set({ selectedPeriod: { ...selectedPeriod, status: 'finalized' } });
        }
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to finalize period' });
      throw error;
    }
  },

  markPeriodPaid: async (periodId) => {
    try {
      const response = await apiClient.put(`/payroll/periods/${periodId}/paid`);

      if (response.data.success) {
        await get().fetchPeriods();
        const { selectedPeriod } = get();
        if (selectedPeriod && (selectedPeriod._id === periodId || selectedPeriod.id === periodId)) {
          set({ selectedPeriod: { ...selectedPeriod, status: 'paid' } });
        }
        await get().fetchEntries(periodId);
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to mark period as paid' });
      throw error;
    }
  },

  updateEntry: async (entryId, data) => {
    try {
      const response = await apiClient.put(`/payroll/entries/${entryId}`, data);

      if (response.data.success) {
        const updated = response.data.data.entry;
        set((state) => ({
          entries: state.entries.map((e) =>
            (e._id === entryId || e.id === entryId) ? { ...e, ...updated } : e
          ),
        }));
        await get().fetchPeriods();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update entry' });
      throw error;
    }
  },

  generatePayslip: async (entryId) => {
    try {
      await apiClient.post(`/payroll/entries/${entryId}/payslip`);
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to generate payslip' });
      throw error;
    }
  },
}));
