// ============================================================================
// LOYALTY STORE - Loyalty Program Management State
// ============================================================================

import { create } from 'zustand';
import { LoyaltyTier, LoyaltyTransaction } from '@/types';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

interface LoyaltySettings {
  pointsPerNaira: number;
  signupBonus: number;
  referralBonus: number;
  birthdayBonus: number;
  enabled: boolean;
}

interface LoyaltyState {
  // State
  tiers: LoyaltyTier[];
  transactions: LoyaltyTransaction[];
  settings: LoyaltySettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTiers: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<LoyaltySettings>) => Promise<void>;
  createTier: (tier: Partial<LoyaltyTier>) => Promise<void>;
  updateTier: (tierId: string, data: Partial<LoyaltyTier>) => Promise<void>;
  deleteTier: (tierId: string) => Promise<void>;
  adjustPoints: (customerId: string, points: number, reason: string) => Promise<void>;
}

// ============================================================================
// LOYALTY STORE
// ============================================================================

export const useLoyaltyStore = create<LoyaltyState>((set, get) => ({
  // Initial state
  tiers: [],
  transactions: [],
  settings: {
    pointsPerNaira: 1,
    signupBonus: 100,
    referralBonus: 500,
    birthdayBonus: 200,
    enabled: true,
  },
  isLoading: false,
  error: null,

  // Fetch tiers
  fetchTiers: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/loyalty/tiers');

      if (response.data.success) {
        const data = response.data.data;
        set({ tiers: data.tiers || data || [], isLoading: false });
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch loyalty tiers');
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch loyalty tiers',
        isLoading: false,
      });
    }
  },

  // Fetch transactions
  fetchTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/loyalty/transactions');

      if (response.data.success) {
        const data = response.data.data;
        set({ transactions: data.transactions || data.ledger || data || [], isLoading: false });
      } else {
        throw new Error(response.data.error?.message || 'Failed to fetch transactions');
      }
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch transactions',
        isLoading: false,
      });
    }
  },

  // Fetch settings
  fetchSettings: async () => {
    try {
      const response = await apiClient.get('/loyalty/settings');

      if (response.data.success) {
        set({ settings: response.data.data });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch loyalty settings' });
    }
  },

  // Update settings
  updateSettings: async (newSettings) => {
    try {
      const response = await apiClient.patch('/loyalty/settings', newSettings);

      if (response.data.success) {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update loyalty settings' });
      throw error;
    }
  },

  // Create tier
  createTier: async (tier) => {
    try {
      const response = await apiClient.post('/loyalty/tiers', tier);

      if (response.data.success) {
        await get().fetchTiers();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to create tier' });
      throw error;
    }
  },

  // Update tier
  updateTier: async (tierId, data) => {
    try {
      const response = await apiClient.put(`/loyalty/tiers/${tierId}`, data);

      if (response.data.success) {
        await get().fetchTiers();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update tier' });
      throw error;
    }
  },

  // Delete tier
  deleteTier: async (tierId) => {
    try {
      const response = await apiClient.delete(`/loyalty/tiers/${tierId}`);

      if (response.data.success) {
        set((state) => ({
          tiers: state.tiers.filter((tier: any) => (tier._id || tier.id) !== tierId),
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete tier' });
      throw error;
    }
  },

  // Adjust points
  adjustPoints: async (customerId, points, reason) => {
    try {
      const response = await apiClient.post('/loyalty/adjust', {
        customerId,
        points,
        reason,
      });

      if (response.data.success) {
        await get().fetchTransactions();
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to adjust points' });
      throw error;
    }
  },
}));
