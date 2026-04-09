// ============================================================================
// NOTIFICATION STORE - Admin/Staff Notification State Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  panelOpen: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notif: AppNotification) => void;
  setPanelOpen: (open: boolean) => void;
}

// ============================================================================
// AUDIO HELPER — generates a short notification beep via Web Audio API
// ============================================================================

export function playNotificationSound(type: 'info' | 'warning' | 'alert' = 'info') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'alert') {
      // Two-tone urgent beep (new order / cancellation)
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'warning') {
      // Single mid-tone beep (shift warning)
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Soft info chime
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch {
    // Silently fail if audio not supported
  }
}

// ============================================================================
// STORE
// ============================================================================

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  panelOpen: false,

  fetchNotifications: async () => {
    // Only show skeleton on first load — don't clear existing notifications while refreshing
    if (get().notifications.length === 0) set({ isLoading: true });
    try {
      const res = await apiClient.get('/notifications?limit=30');
      const notifs: AppNotification[] = res.data.data?.notifications ?? [];
      set({ notifications: notifs, unreadCount: notifs.filter((n) => !n.readAt).length });
    } catch (err) {
      console.error('[NotificationStore] fetchNotifications error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      set({ unreadCount: res.data.data?.count ?? 0 });
    } catch {
      // ignore
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('[NotificationStore] markAsRead error:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.put('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('[NotificationStore] markAllAsRead error:', err);
    }
  },

  addNotification: (notif: AppNotification) => {
    set((state) => ({
      notifications: [notif, ...state.notifications].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    }));
  },

  setPanelOpen: (open: boolean) => set({ panelOpen: open }),
}));
