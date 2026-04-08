// ============================================================================
// ANALYTICS STORE - Reports & Analytics State
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  today: { orders: number; revenue: number; pending: number; completed: number };
  weekly: { orders: number; revenue: number };
  monthly: { orders: number; revenue: number };
  totalCustomers: number;
  activeStaff: number;
  recentOrders: any[];
  topServices: { _id: string; count: number; revenue: number }[];
}

interface RevenueDataPoint {
  _id: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
}

interface OrderStats {
  ordersByStatus: { _id: string; count: number }[];
  ordersByService: { _id: string; count: number }[];
  ordersByType: { _id: string; count: number }[];
  paymentMethods: { _id: string; count: number }[];
}

interface PayrollStats {
  monthlyPayroll: { month: string; totalPay: number; staffCount: number; status: string }[];
  totals: { totalPaid: number; totalBonuses: number; totalDeductions: number; avgPay: number };
  periodsByStatus: { _id: string; count: number }[];
}

interface StaffProductivity {
  _id: string;
  name: string;
  role: string;
  email?: string;
  orderCount: number;
  totalRevenue: number;
  completedOrders: number;
  inProgressOrders: number;
  cancelledOrders: number;
  completionRate: number;
  statusUpdates: number;
  walkinOrders: number;
  shiftsWorked: number;
  attendanceCount: number;
  presentCount: number;
  lateCount: number;
}

interface AnalyticsState {
  dashboardStats: DashboardStats | null;
  revenueReport: RevenueDataPoint[];
  orderStats: OrderStats | null;
  payrollStats: PayrollStats | null;
  staffProductivity: StaffProductivity[];
  isLoading: boolean;
  error: string | null;

  fetchDashboardStats: () => Promise<void>;
  fetchRevenueReport: (params?: { startDate?: string; endDate?: string; groupBy?: string }) => Promise<void>;
  fetchOrderStats: () => Promise<void>;
  fetchPayrollStats: () => Promise<void>;
  fetchStaffProductivity: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
}

// ============================================================================
// ANALYTICS STORE
// ============================================================================

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboardStats: null,
  revenueReport: [],
  orderStats: null,
  payrollStats: null,
  staffProductivity: [],
  isLoading: false,
  error: null,

  fetchDashboardStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/admin/dashboard');
      if (response.data.success) {
        set({ dashboardStats: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchRevenueReport: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/admin/reports/revenue', { params });
      if (response.data.success) {
        const data = response.data.data;
        set({ revenueReport: data.revenue || data || [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchOrderStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/admin/stats/orders');
      if (response.data.success) {
        set({ orderStats: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPayrollStats: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/admin/stats/payroll');
      if (response.data.success) {
        set({ payrollStats: response.data.data, isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchStaffProductivity: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/admin/stats/staff-productivity', { params });
      if (response.data.success) {
        const data = response.data.data;
        set({ staffProductivity: data.staffOrders || data || [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
