// ============================================================================
// SERVICE STORE - Service Management State
// ============================================================================

import { create } from 'zustand';
import apiClient from '@/lib/api/client';

// ============================================================================
// NORMALIZERS — map backend field names to frontend conventions
// ============================================================================

const normalize = (item: any) => ({
  ...item,
  id: item._id?.toString?.() || item.id,
  isActive: item.active ?? item.isActive ?? true,
});

const normalizeDeliveryZone = (item: any) => ({
  ...normalize(item),
  deliveryFee: item.deliveryFee ?? item.fee ?? 0,
});

const normalizeServiceLevel = (item: any) => ({
  ...normalize(item),
  name: item.name || (item.level ? item.level.charAt(0).toUpperCase() + item.level.slice(1) : 'Unknown'),
  level: item.level,
});

// Reverse-map: frontend `isActive` → backend `active`
const toBackend = (data: any) => {
  const out = { ...data };
  if ('isActive' in out) {
    out.active = out.isActive;
    delete out.isActive;
  }
  if ('deliveryFee' in out) {
    out.fee = out.deliveryFee;
    delete out.deliveryFee;
  }
  return out;
};

// ============================================================================
// TYPES
// ============================================================================

const PAGE_LIMIT = 20;

interface PaginationMeta {
  page: number;
  hasMore: boolean;
  isFetchingMore: boolean;
}

const defaultPagination: PaginationMeta = { page: 1, hasMore: false, isFetchingMore: false };

interface ServiceState {
  services: any[];
  categories: any[];
  serviceLevels: any[];
  pickupWindows: any[];
  deliveryZones: any[];
  isLoading: boolean;
  error: string | null;

  // Per-entity pagination
  servicesPagination: PaginationMeta;
  categoriesPagination: PaginationMeta;
  pickupWindowsPagination: PaginationMeta;
  deliveryZonesPagination: PaginationMeta;

  fetchServices: () => Promise<void>;
  loadMoreServices: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  loadMoreCategories: () => Promise<void>;
  fetchServiceLevels: () => Promise<void>;
  fetchPickupWindows: () => Promise<void>;
  loadMorePickupWindows: () => Promise<void>;
  fetchDeliveryZones: () => Promise<void>;
  loadMoreDeliveryZones: () => Promise<void>;

  createService: (data: any) => Promise<void>;
  updateService: (serviceId: string, data: any) => Promise<void>;
  deleteService: (serviceId: string) => Promise<void>;
  reorderServices: (order: { id: string; position: number }[]) => Promise<void>;

  createCategory: (data: any) => Promise<void>;
  updateCategory: (categoryId: string, data: any) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;

  updateServiceLevel: (levelId: string, data: any) => Promise<void>;

  createPickupWindow: (data: any) => Promise<void>;
  updatePickupWindow: (windowId: string, data: any) => Promise<void>;
  deletePickupWindow: (windowId: string) => Promise<void>;

  createDeliveryZone: (data: any) => Promise<void>;
  updateDeliveryZone: (zoneId: string, data: any) => Promise<void>;
  deleteDeliveryZone: (zoneId: string) => Promise<void>;
}

// ============================================================================
// SERVICE STORE
// ============================================================================

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  categories: [],
  serviceLevels: [],
  pickupWindows: [],
  deliveryZones: [],
  isLoading: false,
  error: null,

  servicesPagination: { ...defaultPagination },
  categoriesPagination: { ...defaultPagination },
  pickupWindowsPagination: { ...defaultPagination },
  deliveryZonesPagination: { ...defaultPagination },

  // ---- FETCH ----

  fetchServices: async () => {
    try {
      set({ isLoading: true, error: null, servicesPagination: { page: 1, hasMore: false, isFetchingMore: false } });
      const response = await apiClient.get('/services', { params: { page: 1, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.services || [];
        const pagination = response.data.pagination;
        set({
          services: list.map(normalize),
          isLoading: false,
          servicesPagination: {
            page: 1,
            hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        });
      } else {
        set({ services: [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch services', services: [], isLoading: false });
    }
  },

  loadMoreServices: async () => {
    const { servicesPagination } = get();
    if (servicesPagination.isFetchingMore || !servicesPagination.hasMore) return;
    const nextPage = servicesPagination.page + 1;
    set({ servicesPagination: { ...servicesPagination, isFetchingMore: true } });
    try {
      const response = await apiClient.get('/services', { params: { page: nextPage, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.services || [];
        const pagination = response.data.pagination;
        set((state) => ({
          services: [...state.services, ...list.map(normalize)],
          servicesPagination: {
            page: nextPage,
            hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        }));
      } else {
        set((state) => ({ servicesPagination: { ...state.servicesPagination, isFetchingMore: false, hasMore: false } }));
      }
    } catch {
      set((state) => ({ servicesPagination: { ...state.servicesPagination, isFetchingMore: false } }));
    }
  },

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null, categoriesPagination: { page: 1, hasMore: false, isFetchingMore: false } });
      const response = await apiClient.get('/services/categories', { params: { page: 1, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.categories || [];
        const pagination = response.data.pagination;
        set({
          categories: list.map(normalize),
          isLoading: false,
          categoriesPagination: {
            page: 1,
            hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        });
      } else {
        set({ categories: [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch categories', categories: [], isLoading: false });
    }
  },

  loadMoreCategories: async () => {
    const { categoriesPagination } = get();
    if (categoriesPagination.isFetchingMore || !categoriesPagination.hasMore) return;
    const nextPage = categoriesPagination.page + 1;
    set({ categoriesPagination: { ...categoriesPagination, isFetchingMore: true } });
    try {
      const response = await apiClient.get('/services/categories', { params: { page: nextPage, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.categories || [];
        const pagination = response.data.pagination;
        set((state) => ({
          categories: [...state.categories, ...list.map(normalize)],
          categoriesPagination: {
            page: nextPage,
            hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        }));
      } else {
        set((state) => ({ categoriesPagination: { ...state.categoriesPagination, isFetchingMore: false, hasMore: false } }));
      }
    } catch {
      set((state) => ({ categoriesPagination: { ...state.categoriesPagination, isFetchingMore: false } }));
    }
  },

  fetchServiceLevels: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get('/services/levels');
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.levels || [];
        set({ serviceLevels: list.map(normalizeServiceLevel), isLoading: false });
      } else {
        set({ serviceLevels: [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch service levels', serviceLevels: [], isLoading: false });
    }
  },

  fetchPickupWindows: async () => {
    try {
      set({ isLoading: true, error: null, pickupWindowsPagination: { page: 1, hasMore: false, isFetchingMore: false } });
      const response = await apiClient.get('/services/pickup-windows', { params: { page: 1, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.windows || [];
        const pagination = response.data.pagination;
        set({
          pickupWindows: list.map(normalize),
          isLoading: false,
          pickupWindowsPagination: {
            page: 1,
            hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        });
      } else {
        set({ pickupWindows: [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pickup windows', pickupWindows: [], isLoading: false });
    }
  },

  loadMorePickupWindows: async () => {
    const { pickupWindowsPagination } = get();
    if (pickupWindowsPagination.isFetchingMore || !pickupWindowsPagination.hasMore) return;
    const nextPage = pickupWindowsPagination.page + 1;
    set({ pickupWindowsPagination: { ...pickupWindowsPagination, isFetchingMore: true } });
    try {
      const response = await apiClient.get('/services/pickup-windows', { params: { page: nextPage, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.windows || [];
        const pagination = response.data.pagination;
        set((state) => ({
          pickupWindows: [...state.pickupWindows, ...list.map(normalize)],
          pickupWindowsPagination: {
            page: nextPage,
            hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        }));
      } else {
        set((state) => ({ pickupWindowsPagination: { ...state.pickupWindowsPagination, isFetchingMore: false, hasMore: false } }));
      }
    } catch {
      set((state) => ({ pickupWindowsPagination: { ...state.pickupWindowsPagination, isFetchingMore: false } }));
    }
  },

  fetchDeliveryZones: async () => {
    try {
      set({ isLoading: true, error: null, deliveryZonesPagination: { page: 1, hasMore: false, isFetchingMore: false } });
      const response = await apiClient.get('/services/delivery-zones', { params: { page: 1, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.zones || [];
        const pagination = response.data.pagination;
        set({
          deliveryZones: list.map(normalizeDeliveryZone),
          isLoading: false,
          deliveryZonesPagination: {
            page: 1,
            hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        });
      } else {
        set({ deliveryZones: [], isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch delivery zones', deliveryZones: [], isLoading: false });
    }
  },

  loadMoreDeliveryZones: async () => {
    const { deliveryZonesPagination } = get();
    if (deliveryZonesPagination.isFetchingMore || !deliveryZonesPagination.hasMore) return;
    const nextPage = deliveryZonesPagination.page + 1;
    set({ deliveryZonesPagination: { ...deliveryZonesPagination, isFetchingMore: true } });
    try {
      const response = await apiClient.get('/services/delivery-zones', { params: { page: nextPage, limit: PAGE_LIMIT } });
      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.zones || [];
        const pagination = response.data.pagination;
        set((state) => ({
          deliveryZones: [...state.deliveryZones, ...list.map(normalizeDeliveryZone)],
          deliveryZonesPagination: {
            page: nextPage,
            hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
            isFetchingMore: false,
          },
        }));
      } else {
        set((state) => ({ deliveryZonesPagination: { ...state.deliveryZonesPagination, isFetchingMore: false, hasMore: false } }));
      }
    } catch {
      set((state) => ({ deliveryZonesPagination: { ...state.deliveryZonesPagination, isFetchingMore: false } }));
    }
  },

  // ---- SERVICE CRUD ----

  createService: async (data) => {
    try {
      const response = await apiClient.post('/services', data);
      if (response.data.success) {
        await get().fetchServices();
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create service' });
      throw error;
    }
  },

  updateService: async (serviceId, data) => {
    try {
      await apiClient.put(`/services/${serviceId}`, toBackend(data));
      await get().fetchServices();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update service' });
      throw error;
    }
  },

  deleteService: async (serviceId) => {
    try {
      await apiClient.delete(`/services/${serviceId}`);
      await get().fetchServices();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete service' });
      throw error;
    }
  },

  reorderServices: async (order) => {
    try {
      const response = await apiClient.put('/services/reorder', { order });
      if (response.data.success) {
        const raw = response.data.data?.services ?? [];
        set({ services: raw.map(normalize) });
      }
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to reorder services' });
      throw error;
    }
  },

  // ---- CATEGORY CRUD ----

  createCategory: async (data) => {
    try {
      await apiClient.post('/services/categories', data);
      await get().fetchCategories();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create category' });
      throw error;
    }
  },

  updateCategory: async (categoryId, data) => {
    try {
      await apiClient.put(`/services/categories/${categoryId}`, toBackend(data));
      await get().fetchCategories();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update category' });
      throw error;
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      await apiClient.delete(`/services/categories/${categoryId}`);
      await get().fetchCategories();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete category' });
      throw error;
    }
  },

  // ---- SERVICE LEVEL CRUD ----

  updateServiceLevel: async (levelId, data) => {
    try {
      await apiClient.put(`/services/levels/${levelId}`, toBackend(data));
      await get().fetchServiceLevels();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update service level' });
      throw error;
    }
  },

  // ---- PICKUP WINDOW CRUD ----

  createPickupWindow: async (data) => {
    try {
      await apiClient.post('/services/pickup-windows', data);
      await get().fetchPickupWindows();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create pickup window' });
      throw error;
    }
  },

  updatePickupWindow: async (windowId, data) => {
    try {
      await apiClient.put(`/services/pickup-windows/${windowId}`, toBackend(data));
      await get().fetchPickupWindows();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update pickup window' });
      throw error;
    }
  },

  deletePickupWindow: async (windowId) => {
    try {
      await apiClient.delete(`/services/pickup-windows/${windowId}`);
      await get().fetchPickupWindows();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete pickup window' });
      throw error;
    }
  },

  // ---- DELIVERY ZONE CRUD ----

  createDeliveryZone: async (data) => {
    try {
      await apiClient.post('/services/delivery-zones', data);
      await get().fetchDeliveryZones();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to create delivery zone' });
      throw error;
    }
  },

  updateDeliveryZone: async (zoneId, data) => {
    try {
      await apiClient.put(`/services/delivery-zones/${zoneId}`, toBackend(data));
      await get().fetchDeliveryZones();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to update delivery zone' });
      throw error;
    }
  },

  deleteDeliveryZone: async (zoneId) => {
    try {
      await apiClient.delete(`/services/delivery-zones/${zoneId}`);
      await get().fetchDeliveryZones();
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete delivery zone' });
      throw error;
    }
  },
}));
