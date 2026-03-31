// ============================================================================
// PAYMENT STORE - Payment Management State
// ============================================================================

import { create } from 'zustand';
import { Payment, PaymentMethod } from '@/types';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentSettings {
  enabledMethods: PaymentMethod[];
  paystackPublicKey?: string;
  paystackSecretKey?: string;
  lencoApiKey?: string;
  flutterwavePublicKey?: string;
  flutterwaveSecretKey?: string;
}

interface PaymentFilters {
  status?: string;
  method?: PaymentMethod | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const PAGE_LIMIT = 20;

interface PaymentState {
  // State
  payments: Payment[];
  settings: PaymentSettings;
  filters: PaymentFilters;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  error: string | null;

  // Actions
  fetchPayments: () => Promise<void>;
  loadMorePayments: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<PaymentSettings>) => Promise<void>;
  setFilters: (filters: Partial<PaymentFilters>) => void;
  confirmPayment: (paymentId: string) => Promise<void>;
  refundPayment: (paymentId: string, amount: number) => Promise<void>;
}

// ============================================================================
// PAYMENT STORE
// ============================================================================

export const usePaymentStore = create<PaymentState>((set, get) => ({
  // Initial state
  payments: [],
  settings: {
    enabledMethods: [PaymentMethod.CASH, PaymentMethod.WALLET, PaymentMethod.POS],
  },
  filters: {
    status: 'all',
    method: 'all',
    search: '',
  },
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  currentPage: 1,
  error: null,

  // Fetch payments (resets to page 1)
  fetchPayments: async () => {
    try {
      set({ isLoading: true, error: null, currentPage: 1, hasMore: false });

      const { filters } = get();
      const params: any = { page: 1, limit: PAGE_LIMIT };

      if (filters.status && filters.status !== 'all') params.state = filters.status;
      if (filters.method && filters.method !== 'all') params.method = filters.method;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/payments', { params });

      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.payments || [];
        const pagination = response.data.pagination;
        set({
          payments: list,
          isLoading: false,
          currentPage: 1,
          hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
        });
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch payments');
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch payments', isLoading: false, hasMore: false });
    }
  },

  // Load next page and append
  loadMorePayments: async () => {
    const { isFetchingMore, hasMore, currentPage, filters } = get();
    if (isFetchingMore || !hasMore) return;

    try {
      set({ isFetchingMore: true });
      const nextPage = currentPage + 1;
      const params: any = { page: nextPage, limit: PAGE_LIMIT };

      if (filters.status && filters.status !== 'all') params.state = filters.status;
      if (filters.method && filters.method !== 'all') params.method = filters.method;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/payments', { params });

      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.payments || [];
        const pagination = response.data.pagination;
        set((state) => ({
          payments: [...state.payments, ...list],
          currentPage: nextPage,
          hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
          isFetchingMore: false,
        }));
      } else {
        set({ isFetchingMore: false, hasMore: false });
      }
    } catch (error: any) {
      console.error('Error loading more payments:', error);
      set({ isFetchingMore: false });
    }
  },

  // Fetch settings (backend route: /api/v1/settings/payment)
  fetchSettings: async () => {
    try {
      const response = await apiClient.get('/settings/payment');

      if (response.data.success) {
        set({ settings: response.data.data });
      }
    } catch (error: any) {
      // Settings may not be configured yet — keep defaults
      console.warn('Payment settings fetch failed:', error.message);
    }
  },

  // Update settings (backend route: /api/v1/settings/payment)
  updateSettings: async (newSettings) => {
    try {
      const response = await apiClient.put('/settings/payment', newSettings);

      if (response.data.success) {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update payment settings' });
      throw error;
    }
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().fetchPayments();
  },

  // Confirm payment
  confirmPayment: async (paymentId) => {
    try {
      const response = await apiClient.put(`/payments/${paymentId}/confirm`);

      if (response.data.success) {
        await get().fetchPayments();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to confirm payment' });
      throw error;
    }
  },

  // Refund payment
  refundPayment: async (paymentId, amount) => {
    try {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, { amount });

      if (response.data.success) {
        await get().fetchPayments();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to refund payment' });
      throw error;
    }
  },
}));
