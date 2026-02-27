// ============================================================================
// REFERRAL STORE - Referral Program Management State
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Referral {
  _id: string;
  referrerUserId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  refereeUserId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  status: 'pending' | 'qualified' | 'rewarded' | 'reversed' | 'rejected';
  rewardCredited: boolean;
  rewardAmount: number;
  refereeRewardCredited: boolean;
  refereeRewardAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralSettings {
  _id?: string;
  enabled: boolean;
  referrerRewardAmount: number;
  refereeRewardAmount: number;
  referrerLoyaltyPoints: number;
  refereeLoyaltyPoints: number;
  minOrderCount: number;
  minOrderAmount: number;
  qualifyOnStatus: 'paid' | 'completed';
  maxRewardsPerReferrer?: number;
  allowSelfReferral: boolean;
}

interface ReferralState {
  referrals: Referral[];
  settings: ReferralSettings;
  isLoading: boolean;
  isLoadingSettings: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  fetchReferrals: (params?: { status?: string; page?: number }) => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (data: Partial<ReferralSettings>) => Promise<void>;
  updateReferralStatus: (id: string, status: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useReferralStore = create<ReferralState>((set, get) => ({
  referrals: [],
  settings: {
    enabled: true,
    referrerRewardAmount: 1000,
    refereeRewardAmount: 0,
    referrerLoyaltyPoints: 0,
    refereeLoyaltyPoints: 0,
    minOrderCount: 1,
    minOrderAmount: 0,
    qualifyOnStatus: 'completed',
    allowSelfReferral: false,
  },
  isLoading: false,
  isLoadingSettings: false,
  error: null,
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },

  fetchReferrals: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const queryParams: Record<string, string> = {};
      if (params?.status && params.status !== 'all') queryParams.status = params.status;
      if (params?.page) queryParams.page = String(params.page);
      queryParams.limit = '50';

      const response = await apiClient.get('/referrals', { params: queryParams });

      if (response.data.success) {
        const raw = response.data.data;
        set({
          referrals: raw?.referrals || raw || [],
          pagination: response.data.pagination || get().pagination,
          isLoading: false,
        });
      } else {
        throw new Error('Failed to fetch referrals');
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch referrals', isLoading: false });
    }
  },

  fetchSettings: async () => {
    try {
      set({ isLoadingSettings: true });
      const response = await apiClient.get('/settings/referral');

      if (response.data.success) {
        const raw = response.data.data;
        set({ settings: raw?.settings || raw, isLoadingSettings: false });
      }
    } catch (error: any) {
      console.warn('Referral settings fetch failed:', error.message);
      set({ isLoadingSettings: false });
    }
  },

  updateSettings: async (data) => {
    try {
      const response = await apiClient.put('/settings/referral', data);

      if (response.data.success) {
        const raw = response.data.data;
        set({ settings: raw?.settings || raw });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update referral settings' });
      throw error;
    }
  },

  updateReferralStatus: async (id, status) => {
    try {
      const response = await apiClient.put(`/referrals/${id}/status`, { status });

      if (response.data.success) {
        set((state) => ({
          referrals: state.referrals.map((r) =>
            r._id === id ? { ...r, status: status as Referral['status'] } : r
          ),
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to update referral status' });
      throw error;
    }
  },
}));
