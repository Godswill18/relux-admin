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

interface PaymentState {
  // State
  payments: Payment[];
  settings: PaymentSettings;
  filters: PaymentFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPayments: () => Promise<void>;
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
    enabledMethods: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER],
  },
  filters: {
    status: 'all',
    method: 'all',
    search: '',
  },
  isLoading: false,
  error: null,

  // Fetch payments
  fetchPayments: async () => {
    try {
      set({ isLoading: true, error: null });

      const { filters } = get();
      const params = new URLSearchParams();

      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.method && filters.method !== 'all') {
        params.append('method', filters.method);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await apiClient.get('/payments', {
        params: Object.fromEntries(params)
      });

      if (response.data.success) {
        set({ payments: response.data.data || [], isLoading: false });
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch payments');
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch payments',
        isLoading: false,
      });
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
      const response = await apiClient.post(`/payments/${paymentId}/confirm`);

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
