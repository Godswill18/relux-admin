// ============================================================================
// MOCK DATA INDEX - Central export for all mock data
// ============================================================================

export * from './services';
export * from './customers';
export * from './staff';
export * from './orders';

// Re-export for convenience
import { mockServices, mockServiceCategories, mockServiceLevels, mockPickupWindows, mockDeliveryZones } from './services';
import { mockCustomers, mockWallets, mockLoyaltyTiers } from './customers';
import { mockStaff, mockStaffCompensation, DEMO_CREDENTIALS } from './staff';
import { mockOrders } from './orders';

export const MOCK_DATA = {
  // Services
  services: mockServices,
  serviceCategories: mockServiceCategories,
  serviceLevels: mockServiceLevels,
  pickupWindows: mockPickupWindows,
  deliveryZones: mockDeliveryZones,

  // Customers
  customers: mockCustomers,
  wallets: mockWallets,
  loyaltyTiers: mockLoyaltyTiers,

  // Staff
  staff: mockStaff,
  staffCompensation: mockStaffCompensation,
  demoCredentials: DEMO_CREDENTIALS,

  // Orders
  orders: mockOrders,
};
