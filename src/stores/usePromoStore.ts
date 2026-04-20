// ============================================================================
// PROMO CODE STORE - Promo Code Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PromoCode {
  _id: string;
  id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  usageLimit?: number;
  usagePerUser?: number;
  usageCount?: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PromoState {
  promoCodes: PromoCode[];
  isLoading: boolean;
  error: string | null;

  fetchPromoCodes: () => Promise<void>;
  createPromoCode: (data: Partial<PromoCode>) => Promise<void>;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => Promise<void>;
  deletePromoCode: (id: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const usePromoStore = create<PromoState>((set, get) => ({
  promoCodes: [],
  isLoading: false,
  error: null,

  fetchPromoCodes: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/promos');
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.promoCodes || [];
        set({ promoCodes: list, isLoading: false });
      } else {
        set({ promoCodes: [], isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch promo codes',
        promoCodes: [],
        isLoading: false,
      });
    }
  },

  createPromoCode: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post('/promos', data);
      if (response.data.success) {
        await get().fetchPromoCodes();
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create promo code',
        isLoading: false,
      });
      throw error;
    }
  },

  updatePromoCode: async (id, data) => {
    try {
      const response = await apiClient.put(`/promos/${id}`, data);
      if (response.data.success) {
        await get().fetchPromoCodes();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update promo code' });
      throw error;
    }
  },

  deletePromoCode: async (id) => {
    try {
      const response = await apiClient.delete(`/promos/${id}`);
      if (response.data.success) {
        set((state) => ({
          promoCodes: state.promoCodes.filter((p) => (p._id || p.id) !== id),
        }));
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete promo code' });
      throw error;
    }
  },
}));
