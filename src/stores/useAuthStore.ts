// ============================================================================
// AUTH STORE - Authentication State Management with Zustand
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Permission, AuthTokens } from '@/types';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';
import { initializeSocketListeners, cleanupSocketListeners } from '@/lib/socket/initializeListeners';

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  shiftEndTime: number | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refreshAccessToken: () => Promise<void>;
  checkAuth: () => boolean;
  setShiftEnd: (endTime: number) => void;
  clearShiftEnd: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
}

// ============================================================================
// AUTH STORE
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      shiftEndTime: null,

      // Login action
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          // Send email to backend
          const response = await apiClient.post('/auth/login', {
            email,
            password,
          });

          if (response.data.success) {
            const { user, token } = response.data.data;

            set({
              user,
              token,
              refreshToken: token, // Backend doesn't return separate refreshToken
              permissions: user.permissions || [],
              isAuthenticated: true,
              isLoading: false,
            });

            // Connect to Socket.io with JWT token and initialize listeners
            try {
              socketClient.connect(token);
              console.log('🔌 Socket.io connection initiated after login');

              // Initialize Socket.io event listeners
              setTimeout(() => {
                initializeSocketListeners();
              }, 500); // Small delay to ensure socket is fully connected
            } catch (socketError) {
              console.error('Socket.io connection failed:', socketError);
              // Don't fail login if socket connection fails
            }
          } else {
            throw new Error(response.data.message || 'Login failed');
          }
        } catch (error: any) {
          set({ isLoading: false });
          const message =
            error.response?.data?.message ||
            error.response?.data?.error?.message ||
            (error.response?.status === 429
              ? 'Too many login attempts. Please wait a moment and try again.'
              : null) ||
            error.message ||
            'Login failed';
          throw new Error(message);
        }
      },

      // Logout action
      logout: () => {
        try {
          // Cleanup Socket.io listeners and disconnect
          cleanupSocketListeners();
          socketClient.disconnect();
          console.log('🔌 Socket.io disconnected on logout');

          // Call logout endpoint (fire and forget)
          apiClient.get('/auth/logout').catch(() => {});
        } catch (error) {
          // Ignore errors on logout
        }

        // Clear state
        set({
          user: null,
          token: null,
          refreshToken: null,
          permissions: [],
          isAuthenticated: false,
        });
      },

      // Set user action (for updating user info)
      setUser: (user: User) => {
        set({
          user,
          permissions: user.permissions,
        });
      },

      // Refresh access token (backend doesn't have separate refresh endpoint)
      refreshAccessToken: async () => {
        try {
          const { token } = get();

          if (!token) {
            throw new Error('No token available');
          }

          // Backend doesn't have separate refresh endpoint
          // Token is long-lived (30 days), so we don't need to refresh
          return;
        } catch (error) {
          // If refresh fails, logout
          get().logout();
          throw error;
        }
      },

      // Check if authenticated
      checkAuth: () => {
        const { token, user } = get();
        return !!token && !!user;
      },

      // Shift countdown
      setShiftEnd: (endTime: number) => {
        set({ shiftEndTime: endTime });
      },

      clearShiftEnd: () => {
        set({ shiftEndTime: null });
      },

      forgotPassword: async (email: string) => {
        const response = await apiClient.post('/auth/forgot-password', { email });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Failed to send reset code');
        }
      },

      resetPassword: async (email: string, otp: string, newPassword: string) => {
        const response = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
        if (!response.data.success) {
          throw new Error(response.data.message || 'Password reset failed');
        }
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // Token will be automatically picked up by apiClient interceptor
          // No need to manually set headers
        };
      },
    }
  )
);

// ============================================================================
// AXIOS INTERCEPTORS
// ============================================================================

// Axios interceptors removed - now handled by apiClient in src/lib/api/client.ts

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to get current user
 */
export const useCurrentUser = () => {
  return useAuthStore((state) => state.user);
};

/**
 * Hook to check if user has permission
 */
export const useHasPermission = (permission: Permission): boolean => {
  return useAuthStore((state) => state.permissions.includes(permission));
};

/**
 * Hook to check if user has any of the permissions
 */
export const useHasAnyPermission = (permissions: Permission[]): boolean => {
  return useAuthStore((state) =>
    permissions.some((permission) => state.permissions.includes(permission))
  );
};

/**
 * Hook to check if user has all permissions
 */
export const useHasAllPermissions = (permissions: Permission[]): boolean => {
  return useAuthStore((state) =>
    permissions.every((permission) => state.permissions.includes(permission))
  );
};

/**
 * Hook to check if authenticated
 */
export const useIsAuthenticated = (): boolean => {
  return useAuthStore((state) => state.isAuthenticated);
};
