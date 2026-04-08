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

interface SecretKeyFlags {
  paystackSecretKeySet: boolean;
  lencoSecretKeySet: boolean;
  flutterwaveSecretKeySet: boolean;
}

interface PaymentFilters {
  status?: string;
  method?: PaymentMethod | 'all';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const PAGE_LIMIT = 20;

interface PaystackStats {
  totalRevenue: number;
  pendingCount: number;
  failedCount: number;
}

interface PaymentState {
  // State
  payments: Payment[];
  settings: PaymentSettings;
  secretKeyFlags: SecretKeyFlags;
  filters: PaymentFilters;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  error: string | null;

  // Paystack transactions
  paystackTransactions: any[];
  paystackStats: PaystackStats;
  isLoadingPaystack: boolean;
  paystackPage: number;
  paystackHasMore: boolean;
  paystackPagination: { total: number; page: number; pages: number } | null;

  // Actions
  fetchPayments: () => Promise<void>;
  loadMorePayments: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<PaymentSettings>) => Promise<void>;
  setFilters: (filters: Partial<PaymentFilters>) => void;
  confirmPayment: (paymentId: string) => Promise<void>;
  refundPayment: (paymentId: string, amount: number) => Promise<void>;
  fetchPaystackTransactions: (params?: Record<string, string>) => Promise<void>;
  /** Prepend a newly arrived transaction from socket without refetch */
  prependPaystackTransaction: (tx: any) => void;
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
  secretKeyFlags: {
    paystackSecretKeySet: false,
    lencoSecretKeySet: false,
    flutterwaveSecretKeySet: false,
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
  paystackTransactions: [],
  paystackStats: { totalRevenue: 0, pendingCount: 0, failedCount: 0 },
  isLoadingPaystack: false,
  paystackPage: 1,
  paystackHasMore: false,
  paystackPagination: null,

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
        const { settings: raw, paystackSecretKeySet, lencoSecretKeySet, flutterwaveSecretKeySet } = response.data.data;

        // Map backend boolean flags → enabledMethods array
        const enabledMethods: PaymentMethod[] = [];
        if (raw.enableCash)     enabledMethods.push(PaymentMethod.CASH);
        if (raw.enableWallet)   enabledMethods.push(PaymentMethod.WALLET);
        if (raw.enablePos)      enabledMethods.push(PaymentMethod.POS);
        if (raw.enablePaystack) enabledMethods.push(PaymentMethod.PAYSTACK);
        if (raw.enableTransfer) enabledMethods.push(PaymentMethod.TRANSFER);
        if (raw.enableLenco)    enabledMethods.push(PaymentMethod.LENCO);

        set({
          settings: {
            enabledMethods,
            paystackPublicKey:    raw.paystackPublicKey    || '',
            lencoApiKey:          raw.lencoPublicKey       || '',
            flutterwavePublicKey: raw.flutterwavePublicKey || '',
          },
          secretKeyFlags: {
            paystackSecretKeySet:    !!paystackSecretKeySet,
            lencoSecretKeySet:       !!lencoSecretKeySet,
            flutterwaveSecretKeySet: !!flutterwaveSecretKeySet,
          },
        });
      }
    } catch (error: any) {
      // Settings may not be configured yet — keep defaults
      console.warn('Payment settings fetch failed:', error.message);
    }
  },

  // Update settings (backend route: /api/v1/settings/payment)
  updateSettings: async (newSettings) => {
    try {
      // Map enabledMethods array → backend boolean flags
      const methods = newSettings.enabledMethods || get().settings.enabledMethods;
      const payload: Record<string, any> = {
        enableCash:     methods.includes(PaymentMethod.CASH),
        enableWallet:   methods.includes(PaymentMethod.WALLET),
        enablePos:      methods.includes(PaymentMethod.POS),
        enablePaystack: methods.includes(PaymentMethod.PAYSTACK),
        enableTransfer: methods.includes(PaymentMethod.TRANSFER),
        enableLenco:    methods.includes(PaymentMethod.LENCO),
        paystackPublicKey:    newSettings.paystackPublicKey    ?? get().settings.paystackPublicKey,
        flutterwavePublicKey: newSettings.flutterwavePublicKey ?? get().settings.flutterwavePublicKey,
        // Map frontend field names to backend field names
        lencoPublicKey: newSettings.lencoApiKey ?? get().settings.lencoApiKey,
      };

      // Only include secret keys if the user actually typed a value
      if (newSettings.paystackSecretKey)    payload.paystackSecretKey    = newSettings.paystackSecretKey;
      if (newSettings.lencoApiKey && newSettings.lencoApiKey !== get().settings.lencoApiKey) {
        // lencoApiKey in the UI maps to the secret/API key on backend
        payload.lencoSecretKey = newSettings.lencoApiKey;
      }
      if (newSettings.flutterwaveSecretKey) payload.flutterwaveSecretKey = newSettings.flutterwaveSecretKey;

      const response = await apiClient.put('/settings/payment', payload);

      if (response.data.success) {
        // Update store with new settings (secret keys are cleared locally for security)
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
            // Never store secret keys in the store after save
            paystackSecretKey:    undefined,
            flutterwaveSecretKey: undefined,
          },
          secretKeyFlags: {
            paystackSecretKeySet:    !!(newSettings.paystackSecretKey    || state.secretKeyFlags.paystackSecretKeySet),
            lencoSecretKeySet:       !!(newSettings.lencoApiKey          || state.secretKeyFlags.lencoSecretKeySet),
            flutterwaveSecretKeySet: !!(newSettings.flutterwaveSecretKey || state.secretKeyFlags.flutterwaveSecretKeySet),
          },
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

  // Fetch Paystack transactions
  fetchPaystackTransactions: async (params = {}) => {
    set({ isLoadingPaystack: true });
    try {
      const response = await apiClient.get('/payments/paystack/transactions', { params: { limit: '20', ...params } });
      if (response.data.success) {
        const { transactions, stats } = response.data.data;
        const pagination = response.data.pagination;
        set({
          paystackTransactions: transactions || [],
          paystackStats: stats || { totalRevenue: 0, pendingCount: 0, failedCount: 0 },
          paystackPage: pagination?.page ?? 1,
          paystackHasMore: pagination ? pagination.page < pagination.pages : false,
          paystackPagination: pagination
            ? { total: pagination.total, page: pagination.page, pages: pagination.pages }
            : null,
          isLoadingPaystack: false,
        });
      }
    } catch {
      set({ isLoadingPaystack: false });
    }
  },

  prependPaystackTransaction: (tx) => {
    set((state) => {
      // If a transaction with this reference already exists (e.g. it was pending),
      // update it in place instead of duplicating it at the top.
      const existingIndex = state.paystackTransactions.findIndex(
        (t: any) => t.reference === tx.reference || t._id?.toString() === tx.transactionId?.toString()
      );

      let updatedList: any[];
      let prevStatus: string | null = null;

      if (existingIndex !== -1) {
        prevStatus = state.paystackTransactions[existingIndex].status;
        updatedList = state.paystackTransactions.map((t: any, i: number) =>
          i === existingIndex ? { ...t, ...tx } : t
        );
      } else {
        updatedList = [tx, ...state.paystackTransactions];
      }

      // Recalculate stat deltas based on status transition
      const wasAlreadyPaid    = prevStatus === 'paid';
      const wasAlreadyPending = prevStatus === 'pending';
      const wasAlreadyFailed  = prevStatus === 'failed';

      return {
        paystackTransactions: updatedList,
        paystackStats: {
          ...state.paystackStats,
          totalRevenue:
            tx.status === 'paid' && !wasAlreadyPaid
              ? state.paystackStats.totalRevenue + (tx.amount || 0)
              : state.paystackStats.totalRevenue,
          pendingCount:
            tx.status === 'pending' && !wasAlreadyPending
              ? state.paystackStats.pendingCount + 1
              : wasAlreadyPending && tx.status !== 'pending'
              ? Math.max(0, state.paystackStats.pendingCount - 1)
              : state.paystackStats.pendingCount,
          failedCount:
            tx.status === 'failed' && !wasAlreadyFailed
              ? state.paystackStats.failedCount + 1
              : state.paystackStats.failedCount,
        },
      };
    });
  },
}));
