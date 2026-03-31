// ============================================================================
// ORDER STORE - Order Management State
// ============================================================================

import { create } from 'zustand';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import apiClient from '@/lib/api/client';
import socketClient from '@/lib/socket/client';

// ============================================================================
// TYPES
// ============================================================================

interface OrderFilters {
  status?: OrderStatus | 'all';
  paymentStatus?: PaymentStatus | 'all';
  search?: string;
}

const PAGE_LIMIT = 20;

interface OrderState {
  // State
  orders: Order[];
  selectedOrder: Order | null;
  filters: OrderFilters;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  error: string | null;

  // Actions
  fetchOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<Order | null>;
  updateOrder: (orderId: string, orderData: Partial<Order>) => Promise<void>;
  setSelectedOrder: (order: Order | null) => void;
  setFilters: (filters: Partial<OrderFilters>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  assignStaff: (orderId: string, staffId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  initializeSocketListeners: () => void;
}

// ============================================================================
// ORDER STORE
// ============================================================================

export const useOrderStore = create<OrderState>((set, get) => ({
  // Initial state
  orders: [],
  selectedOrder: null,
  filters: {
    status: 'all',
    paymentStatus: 'all',
    search: '',
  },
  isLoading: false,
  isFetchingMore: false,
  hasMore: false,
  currentPage: 1,
  error: null,

  // Fetch orders (resets to page 1)
  fetchOrders: async () => {
    try {
      set({ isLoading: true, error: null, currentPage: 1, hasMore: false });

      const { filters } = get();
      const params: any = { page: 1, limit: PAGE_LIMIT };

      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.paymentStatus && filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/orders', { params });

      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.orders || [];
        const pagination = response.data.pagination;
        set({
          orders: list,
          isLoading: false,
          currentPage: 1,
          hasMore: pagination ? pagination.page < pagination.pages : list.length === PAGE_LIMIT,
        });
      } else {
        set({ orders: [], isLoading: false, hasMore: false });
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch orders',
        orders: [],
        isLoading: false,
        hasMore: false,
      });
    }
  },

  // Load next page and append
  loadMoreOrders: async () => {
    const { isFetchingMore, hasMore, currentPage, filters } = get();
    if (isFetchingMore || !hasMore) return;

    try {
      set({ isFetchingMore: true });
      const nextPage = currentPage + 1;
      const params: any = { page: nextPage, limit: PAGE_LIMIT };

      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.paymentStatus && filters.paymentStatus !== 'all') params.paymentStatus = filters.paymentStatus;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get('/orders', { params });

      if (response.data.success) {
        const raw = response.data.data;
        const list = Array.isArray(raw) ? raw : raw?.orders || [];
        const pagination = response.data.pagination;
        set((state) => ({
          orders: [...state.orders, ...list],
          currentPage: nextPage,
          hasMore: pagination ? nextPage < pagination.pages : list.length === PAGE_LIMIT,
          isFetchingMore: false,
        }));
      } else {
        set({ isFetchingMore: false, hasMore: false });
      }
    } catch (error: any) {
      console.error('Error loading more orders:', error);
      set({ isFetchingMore: false });
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/orders', orderData);

      if (response.data.success) {
        const raw = response.data.data;
        const newOrder = raw?.order || raw;
        set((state) => ({
          orders: [newOrder, ...state.orders],
          isLoading: false,
        }));
        return newOrder;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating order:', error);
      set({
        error: error.response?.data?.message || 'Failed to create order',
        isLoading: false,
      });
      throw error;
    }
  },

  // Update order
  updateOrder: async (orderId, orderData) => {
    try {
      const response = await apiClient.put(`/orders/${orderId}`, orderData);

      if (response.data.success) {
        const raw = response.data.data;
        const updatedOrder = raw?.order || raw;
        set((state) => ({
          orders: state.orders.map((order) =>
            order._id === orderId ? updatedOrder : order
          ),
          selectedOrder:
            state.selectedOrder?._id === orderId ? updatedOrder : state.selectedOrder,
        }));
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      set({ error: error.response?.data?.message || 'Failed to update order' });
      throw error;
    }
  },

  // Set selected order
  setSelectedOrder: (order) => {
    set({ selectedOrder: order });
  },

  // Set filters
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    // Re-fetch with new filters
    get().fetchOrders();
  },

  // Update order status
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/status`, { status });

      if (response.data.success) {
        // Update local state
        set((state) => ({
          orders: state.orders.map((order) =>
            order._id === orderId ? { ...order, status } : order
          ),
          selectedOrder:
            state.selectedOrder?._id === orderId
              ? { ...state.selectedOrder, status }
              : state.selectedOrder,
        }));
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      set({ error: error.response?.data?.message || 'Failed to update order status' });
      throw error;
    }
  },

  // Assign staff to order
  assignStaff: async (orderId, staffId) => {
    try {
      const response = await apiClient.patch(`/orders/${orderId}/assign`, {
        staffId,
      });

      if (response.data.success) {
        const raw = response.data.data;
        const updatedOrder = raw?.order || raw;
        // Update local state with populated assignedStaff
        set((state) => ({
          orders: state.orders.map((order) =>
            (order._id || order.id) === orderId
              ? { ...order, assignedStaff: updatedOrder.assignedStaff }
              : order
          ),
          selectedOrder:
            (state.selectedOrder?._id || state.selectedOrder?.id) === orderId
              ? { ...state.selectedOrder, assignedStaff: updatedOrder.assignedStaff }
              : state.selectedOrder,
        }));
      }
    } catch (error: any) {
      console.error('Error assigning staff:', error);
      set({ error: error.response?.data?.message || 'Failed to assign staff' });
      throw error;
    }
  },

  // Delete order
  deleteOrder: async (orderId) => {
    try {
      const response = await apiClient.delete(`/orders/${orderId}`);

      if (response.data.success) {
        set((state) => ({
          orders: state.orders.filter((order) => order._id !== orderId),
          selectedOrder: state.selectedOrder?._id === orderId ? null : state.selectedOrder,
        }));
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      set({ error: error.response?.data?.message || 'Failed to delete order' });
      throw error;
    }
  },

  // Initialize Socket.io listeners for realtime updates
  initializeSocketListeners: () => {
    const socket = socketClient.getSocket();
    if (!socket) {
      console.warn('Socket.io not connected. Cannot initialize order listeners.');
      return;
    }

    console.log('🔌 Initializing order Socket.io listeners');

    // Listen for order status updates
    socket.on('order:status-updated', (data: { orderId: string; status: OrderStatus }) => {
      console.log('📦 Order status updated:', data);
      set((state) => ({
        orders: state.orders.map((order) =>
          order._id === data.orderId ? { ...order, status: data.status } : order
        ),
        selectedOrder:
          state.selectedOrder?._id === data.orderId
            ? { ...state.selectedOrder, status: data.status }
            : state.selectedOrder,
      }));
    });

    // Listen for new orders
    socket.on('order:created', (order: Order) => {
      console.log('📦 New order created:', order);
      set((state) => ({
        orders: [order, ...state.orders],
      }));
    });

    // Listen for order updates
    socket.on('order:updated', (order: Order) => {
      console.log('📦 Order updated:', order);
      set((state) => ({
        orders: state.orders.map((o) => (o._id === order._id ? order : o)),
        selectedOrder: state.selectedOrder?._id === order._id ? order : state.selectedOrder,
      }));
    });

    // Listen for order assignment
    socket.on('order:assigned', (data: { orderId: string; assignedTo: any }) => {
      console.log('📦 Order assigned:', data);
      set((state) => ({
        orders: state.orders.map((order) =>
          order._id === data.orderId ? { ...order, assignedTo: data.assignedTo } : order
        ),
      }));
    });
  },
}));
