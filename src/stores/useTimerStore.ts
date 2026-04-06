import { create } from 'zustand';
import apiClient from '@/lib/api/client';

export interface StageDurations {
  confirmed: number;
  'picked-up': number;
  in_progress: number;
  washing: number;
  ironing: number;
  'out-for-delivery': number;
  [key: string]: number;
}

const DEFAULT_DURATIONS: StageDurations = {
  confirmed: 15,
  'picked-up': 90,
  in_progress: 180,
  washing: 240,
  ironing: 90,
  'out-for-delivery': 120,
};

interface TimerStore {
  durations: StageDurations;
  isLoading: boolean;
  isSaving: boolean;
  fetchDurations: () => Promise<void>;
  updateDurations: (data: Partial<StageDurations>) => Promise<void>;
}

export const useTimerStore = create<TimerStore>()((set) => ({
  durations: DEFAULT_DURATIONS,
  isLoading: false,
  isSaving: false,

  fetchDurations: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/settings/stage-durations');
      if (res.data.success) {
        set({ durations: { ...DEFAULT_DURATIONS, ...res.data.data.settings } });
      }
    } catch {
      // keep defaults silently
    } finally {
      set({ isLoading: false });
    }
  },

  updateDurations: async (data) => {
    set({ isSaving: true });
    try {
      const res = await apiClient.put('/settings/stage-durations', data);
      if (res.data.success) {
        set((state) => ({ durations: { ...state.durations, ...res.data.data.settings } }));
      }
    } finally {
      set({ isSaving: false });
    }
  },
}));
