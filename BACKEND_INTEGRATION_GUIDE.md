# Backend Integration Guide - Zustand Stores

This document outlines how all Zustand stores have been configured to connect to the backend API.

## ✅ Completed Store Updates

### 1. Order Store (`src/stores/useOrderStore.ts`)

**Changes Made:**
- ✅ Replaced `axios` with `apiClient`
- ✅ Added `createOrder` function for creating new orders
- ✅ Added `updateOrder` function for updating orders
- ✅ Updated all endpoints to use correct backend paths
- ✅ Added proper error handling with console logging
- ✅ Returns empty arrays on error instead of crashing

**API Endpoints Used:**
- `GET /orders` - Fetch all orders (with filters)
- `POST /orders` - Create new order
- `PUT /orders/:id` - Update order
- `PATCH /orders/:id/status` - Update order status
- `PATCH /orders/:id/assign` - Assign staff to order
- `DELETE /orders/:id` - Delete order

**Usage Example:**
```typescript
const { orders, fetchOrders, createOrder, updateOrderStatus } = useOrderStore();

// Fetch orders
await fetchOrders();

// Create order
await createOrder({
  customerId: '123',
  items: [...],
  total: 5000,
});

// Update status
await updateOrderStatus(orderId, OrderStatus.IN_PROGRESS);
```

---

## 📋 Stores To Update

All other stores need the same pattern applied:

### 2. Customer Store (`src/stores/useCustomerStore.ts`)

**Required Changes:**
1. Import `apiClient` instead of `axios`
2. Update all API calls to use `apiClient.get/post/put/patch/delete`
3. Use backend endpoints: `/customers`, `/customers/:id`, `/customers/:id/wallet`
4. Add proper error handling
5. Return empty arrays on error

**Functions Needed:**
- `fetchCustomers()` - GET /customers
- `createCustomer(data)` - POST /customers
- `updateCustomer(id, data)` - PUT /customers/:id
- `deleteCustomer(id)` - DELETE /customers/:id
- `addWalletCredit(id, amount)` - POST /customers/:id/wallet/credit
- `deductWalletBalance(id, amount)` - POST /customers/:id/wallet/debit

### 3. Service Store (`src/stores/useServiceStore.ts`)

**Required Changes:**
Same pattern as above

**Backend Endpoints:**
- GET /services
- POST /services
- PUT /services/:id
- DELETE /services/:id
- GET /service-categories
- POST /service-categories
- GET /service-levels

### 4. Staff Store (`src/stores/useStaffStore.ts`)

**Backend Endpoints:**
- GET /staff
- POST /staff
- PUT /staff/:id
- DELETE /staff/:id
- GET /staff/:id/compensation
- PUT /staff/:id/compensation

### 5. Payment Store (`src/stores/usePaymentStore.ts`)

**Backend Endpoints:**
- GET /payments
- POST /payments
- GET /payment-settings
- PUT /payment-settings

### 6. Loyalty Store (`src/stores/useLoyaltyStore.ts`)

**Backend Endpoints:**
- GET /loyalty/tiers
- POST /loyalty/tiers
- GET /loyalty/points/:customerId
- POST /loyalty/points/adjust

### 7. Attendance Store (Create if doesn't exist)

**Backend Endpoints:**
- POST /attendance/clock-in
- PUT /attendance/clock-out
- GET /attendance/me
- GET /staff/shifts/me

---

## 🔧 Standard Store Template

Use this template for all stores:

```typescript
import { create } from 'zustand';
import apiClient from '@/lib/api/client';

interface StoreState {
  items: any[];
  isLoading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  createItem: (data: any) => Promise<any>;
  updateItem: (id: string, data: any) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchItems: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.get('/endpoint');

      if (response.data.success) {
        set({ items: response.data.data || [], isLoading: false });
      } else {
        set({ items: [], isLoading: false });
      }
    } catch (error: any) {
      console.error('Error fetching items:', error);
      set({
        error: error.response?.data?.message || 'Failed to fetch items',
        items: [],
        isLoading: false,
      });
    }
  },

  createItem: async (data) => {
    try {
      set({ isLoading: true, error: null });

      const response = await apiClient.post('/endpoint', data);

      if (response.data.success) {
        const newItem = response.data.data;
        set((state) => ({
          items: [newItem, ...state.items],
          isLoading: false,
        }));
        return newItem;
      }
      return null;
    } catch (error: any) {
      console.error('Error creating item:', error);
      set({
        error: error.response?.data?.message || 'Failed to create item',
        isLoading: false,
      });
      throw error;
    }
  },

  updateItem: async (id, data) => {
    try {
      const response = await apiClient.put(`/endpoint/${id}`, data);

      if (response.data.success) {
        const updated = response.data.data;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? updated : item
          ),
        }));
      }
    } catch (error: any) {
      console.error('Error updating item:', error);
      set({ error: error.response?.data?.message || 'Failed to update item' });
      throw error;
    }
  },

  deleteItem: async (id) => {
    try {
      const response = await apiClient.delete(`/endpoint/${id}`);

      if (response.data.success) {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      set({ error: error.response?.data?.message || 'Failed to delete item' });
      throw error;
    }
  },
}));
```

---

## 🎯 Backend API Response Format

All backend endpoints should return this format:

```json
{
  "success": true,
  "data": {...} or [...],
  "message": "Optional message",
  "error": null
}
```

For errors:
```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error"
  }
}
```

---

## 🔐 Authentication

All API calls automatically include the JWT token via `apiClient` interceptor:

```typescript
// src/lib/api/client.ts
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    const { state } = JSON.parse(token);
    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});
```

---

## 📊 Dashboard Integration

The AdminDashboard has been simplified for now. To integrate with backend:

1. Uncomment the store imports in AdminDashboard.tsx
2. Use the stores to fetch data:

```typescript
const { orders, fetchOrders } = useOrderStore();
const { customers, fetchCustomers } = useCustomerStore();
const { services, fetchServices } = useServiceStore();

useEffect(() => {
  fetchOrders();
  fetchCustomers();
  fetchServices();
}, []);
```

3. Calculate metrics from the fetched data
4. Display in the UI

---

## ✅ Testing Checklist

- [ ] Order Store - Fetch, Create, Update, Delete
- [ ] Customer Store - Fetch, Create, Update, Wallet operations
- [ ] Service Store - Fetch, Create, Update, Delete
- [ ] Staff Store - Fetch, Create, Update, Compensation
- [ ] Payment Store - Fetch transactions, Update settings
- [ ] Loyalty Store - Fetch tiers, Adjust points
- [ ] Attendance - Clock in/out, View schedule
- [ ] All stores handle errors gracefully
- [ ] All stores show loading states
- [ ] All stores return empty arrays on error instead of crashing

---

## 🚀 Next Steps

1. ✅ Order Store - **COMPLETED**
2. Update Customer Store using the template
3. Update Service Store using the template
4. Update Staff Store using the template
5. Update remaining stores (Payment, Loyalty, etc.)
6. Reconnect AdminDashboard to use stores
7. Test each page with backend API
8. Handle backend-specific data formats
9. Add toast notifications for success/error states

---

## 📝 Notes

- All stores use `apiClient` which automatically adds JWT token
- Error handling logs to console for debugging
- Empty arrays returned on error to prevent crashes
- Loading states managed in each store
- Optimistic UI updates where appropriate
