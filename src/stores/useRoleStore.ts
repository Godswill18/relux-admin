// ============================================================================
// ROLE STORE - RBAC Role & Permission Management
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// TYPES
// ============================================================================

export interface RoleDoc {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface RoleStore {
  roles: RoleDoc[];
  roleUsers: Record<string, any[]>; // roleId → users[]
  isLoading: boolean;
  isSaving: boolean;

  fetchRoles: () => Promise<void>;
  updateRolePermissions: (roleId: string, permissions: string[]) => Promise<void>;
  fetchRoleUsers: (roleId: string) => Promise<void>;
  assignUserToRole: (roleId: string, userId: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useRoleStore = create<RoleStore>((set, get) => ({
  roles: [],
  roleUsers: {},
  isLoading: false,
  isSaving: false,

  fetchRoles: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/roles');
      const roles: RoleDoc[] = res.data.data?.roles ?? [];
      set({ roles });
    } finally {
      set({ isLoading: false });
    }
  },

  updateRolePermissions: async (roleId: string, permissions: string[]) => {
    set({ isSaving: true });
    try {
      const res = await apiClient.put(`/roles/${roleId}`, { permissions });
      const updated: RoleDoc = res.data.data?.role;
      set((state) => ({
        roles: state.roles.map((r) => (r._id === roleId ? updated : r)),
      }));
    } finally {
      set({ isSaving: false });
    }
  },

  fetchRoleUsers: async (roleId: string) => {
    try {
      const res = await apiClient.get(`/roles/${roleId}/users`);
      const users: any[] = res.data.data?.users ?? [];
      set((state) => ({
        roleUsers: { ...state.roleUsers, [roleId]: users },
      }));
    } catch (_) {
      // Silently fail — user list is non-critical
    }
  },

  assignUserToRole: async (roleId: string, userId: string) => {
    await apiClient.patch(`/roles/${roleId}/assign`, { userId });
    // Refresh user list for this role
    await get().fetchRoleUsers(roleId);
  },
}));
