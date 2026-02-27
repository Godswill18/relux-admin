// ============================================================================
// SUBSCRIPTION STORE - Subscription Plan & Active Subscription Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionPlan {
  _id: string;
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  itemLimit: number;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRecord {
  _id: string;
  id: string;
  customerId: { _id: string; name: string; phone: string } | string;
  planId: { _id: string; name: string; price: number } | string;
  planName: string;
  status: 'active' | 'paused' | 'past_due' | 'expired' | 'cancelled';
  autoRenew: boolean;
  periodStart: string;
  periodEnd: string;
  nextBilling: string;
  createdAt: string;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  subscriptions: SubscriptionRecord[];
  isLoading: boolean;
  error: string | null;

  fetchPlans: () => Promise<void>;
  createPlan: (data: Partial<SubscriptionPlan>) => Promise<void>;
  updatePlan: (planId: string, data: Partial<SubscriptionPlan>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  fetchSubscriptions: () => Promise<void>;
  cancelSubscription: (id: string) => Promise<void>;
  pauseSubscription: (id: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  plans: [],
  subscriptions: [],
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/subscriptions/plans');
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.plans || [];
        set({ plans: list, isLoading: false });
      } else {
        set({ plans: [], isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch plans',
        plans: [],
        isLoading: false,
      });
    }
  },

  createPlan: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post('/subscriptions/plans', data);
      if (response.data.success) {
        await get().fetchPlans();
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create plan',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePlan: async (planId, data) => {
    try {
      const response = await apiClient.put(`/subscriptions/plans/${planId}`, data);
      if (response.data.success) {
        await get().fetchPlans();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update plan' });
      throw error;
    }
  },

  deletePlan: async (planId) => {
    try {
      const response = await apiClient.delete(`/subscriptions/plans/${planId}`);
      if (response.data.success) {
        set((state) => ({
          plans: state.plans.filter((p) => (p._id || p.id) !== planId),
        }));
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete plan' });
      throw error;
    }
  },

  fetchSubscriptions: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/subscriptions');
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.subscriptions || [];
        set({ subscriptions: list, isLoading: false });
      } else {
        set({ subscriptions: [], isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch subscriptions',
        subscriptions: [],
        isLoading: false,
      });
    }
  },

  cancelSubscription: async (id) => {
    try {
      await apiClient.put(`/subscriptions/${id}/cancel`);
      await get().fetchSubscriptions();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to cancel subscription' });
      throw error;
    }
  },

  pauseSubscription: async (id) => {
    try {
      await apiClient.put(`/subscriptions/${id}/pause`);
      await get().fetchSubscriptions();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to pause subscription' });
      throw error;
    }
  },

  resumeSubscription: async (id) => {
    try {
      await apiClient.put(`/subscriptions/${id}/resume`);
      await get().fetchSubscriptions();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to resume subscription' });
      throw error;
    }
  },
}));
