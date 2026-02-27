// ============================================================================
// CUSTOMER STORE - Customer Management State
// ============================================================================

import { create } from 'zustand';
import { Customer, CustomerStatus } from '@/types';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface CustomerFilters {
  status?: CustomerStatus | 'all';
  loyaltyTier?: string | 'all';
  search?: string;
}

interface WalletData {
  _id: string;
  balance: number;
  customerId: string;
}

interface WalletTx {
  _id: string;
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
  createdAt: string;
}

interface LoyaltyData {
  pointsBalance: number;
  tier: { name: string; rank: number } | null;
  recentLedger: { type: string; points: number; reason: string; createdAt: string }[];
}

interface CustomerState {
  // State
  customers: Customer[];
  selectedCustomer: Customer | null;
  filters: CustomerFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCustomers: () => Promise<void>;
  createCustomer: (customerData: Partial<Customer>) => Promise<Customer | null>;
  updateCustomer: (customerId: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  setSelectedCustomer: (customer: Customer | null) => void;
  setFilters: (filters: Partial<CustomerFilters>) => void;

  // Wallet actions
  fetchWallet: (customerId: string) => Promise<WalletData>;
  fetchWalletTransactions: (customerId: string) => Promise<WalletTx[]>;
  creditWallet: (customerId: string, amount: number, reason?: string) => Promise<WalletData>;
  debitWallet: (customerId: string, amount: number, reason?: string) => Promise<WalletData>;

  // Loyalty actions
  fetchCustomerLoyalty: (customerId: string) => Promise<LoyaltyData>;
  adjustLoyaltyPoints: (customerId: string, points: number, reason: string) => Promise<void>;
}

// ============================================================================
// CUSTOMER STORE
// ============================================================================

export const useCustomerStore = create<CustomerState>((set, get) => ({
  // Initial state
  customers: [],
  selectedCustomer: null,
  filters: {
    status: 'all',
    loyaltyTier: 'all',
    search: '',
  },
  isLoading: false,
  error: null,

  // Fetch customers
  fetchCustomers: async () => {
    try {
      set({ isLoading: true, error: null });

      const { filters } = get();
      const params: any = {};

      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.loyaltyTier && filters.loyaltyTier !== 'all') {
        params.loyaltyTier = filters.loyaltyTier;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await apiClient.get('/customers', { params });

      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.customers || [];
        set({ customers: list, isLoading: false });
      } else {
        set({ customers: [], isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch customers',
        customers: [],
        isLoading: false,
      });
    }
  },

  // Create new customer
  createCustomer: async (customerData) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/customers', customerData);

      if (response.data.success) {
        const newCustomer = response.data.data;
        set((state) => ({
          customers: [newCustomer, ...state.customers],
          isLoading: false,
        }));
        return newCustomer;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      set({
        error: error.response?.data?.message || 'Failed to create customer',
        isLoading: false,
      });
      throw error;
    }
  },

  // Set selected customer
  setSelectedCustomer: (customer) => {
    set({ selectedCustomer: customer });
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Re-fetch with new filters
    get().fetchCustomers();
  },

  // Update customer
  updateCustomer: async (customerId, data) => {
    try {
      const response = await apiClient.put(`/customers/${customerId}`, data);

      if (response.data.success) {
        const updatedCustomer = response.data.data;
        set((state) => ({
          customers: state.customers.map((customer) =>
            customer.id === customerId ? updatedCustomer : customer
          ),
          selectedCustomer:
            state.selectedCustomer?.id === customerId ? updatedCustomer : state.selectedCustomer,
        }));
      }
    } catch (error: any) {
      console.error('Error updating customer:', error);
      set({ error: error.response?.data?.message || 'Failed to update customer' });
      throw error;
    }
  },

  // Delete customer
  deleteCustomer: async (customerId) => {
    try {
      const response = await apiClient.delete(`/customers/${customerId}`);

      if (response.data.success) {
        set((state) => ({
          customers: state.customers.filter((customer) => customer.id !== customerId),
          selectedCustomer:
            state.selectedCustomer?.id === customerId ? null : state.selectedCustomer,
        }));
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      set({ error: error.response?.data?.message || 'Failed to delete customer' });
      throw error;
    }
  },

  // Fetch wallet
  fetchWallet: async (customerId) => {
    const response = await apiClient.get(`/wallets/customer/${customerId}`);
    return response.data.data.wallet;
  },

  // Fetch wallet transactions
  fetchWalletTransactions: async (customerId) => {
    const walletResponse = await apiClient.get(`/wallets/customer/${customerId}`);
    const walletId = walletResponse.data.data.wallet?._id;
    if (!walletId) return [];
    const txResponse = await apiClient.get(`/wallets/customer/${customerId}/transactions`);
    return txResponse.data.data.transactions || [];
  },

  // Admin credit wallet
  creditWallet: async (customerId, amount, reason) => {
    const response = await apiClient.post('/wallets/admin-credit', { customerId, amount, reason });
    return response.data.data.wallet;
  },

  // Debit wallet
  debitWallet: async (customerId, amount, reason) => {
    const response = await apiClient.post('/wallets/debit', { customerId, amount, reason });
    return response.data.data.wallet;
  },

  // Fetch customer loyalty
  fetchCustomerLoyalty: async (customerId) => {
    const response = await apiClient.get(`/loyalty/customer/${customerId}`);
    return response.data.data;
  },

  // Adjust loyalty points
  adjustLoyaltyPoints: async (customerId, points, reason) => {
    await apiClient.post('/loyalty/adjust', { customerId, points, reason });
  },
}));
