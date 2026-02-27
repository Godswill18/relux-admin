import {
  Service,
  ServiceCategory,
  ServiceLevelConfig,
  PickupWindow,
  DeliveryZone,
  ServiceLevel,
} from '@/types';

// ============================================================================
// SERVICES
// ============================================================================

export const mockServices: Service[] = [
  {
    id: 'service-1',
    name: 'Wash & Fold',
    description: 'Professional washing and folding service',
    iconUrl: '/icons/washing-machine.svg',
    isActive: true,
    categories: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'service-2',
    name: 'Dry Cleaning',
    description: 'Professional dry cleaning for delicate fabrics',
    iconUrl: '/icons/dry-clean.svg',
    isActive: true,
    categories: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'service-3',
    name: 'Ironing',
    description: 'Professional pressing and ironing service',
    iconUrl: '/icons/iron.svg',
    isActive: true,
    categories: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'service-4',
    name: 'Wash & Iron',
    description: 'Complete washing and ironing service',
    iconUrl: '/icons/wash-iron.svg',
    isActive: true,
    categories: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// SERVICE CATEGORIES
// ============================================================================

export const mockServiceCategories: ServiceCategory[] = [
  // Wash & Fold Categories
  { id: 'cat-1', serviceId: 'service-1', name: 'Shirt', basePrice: 500, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-2', serviceId: 'service-1', name: 'Trousers', basePrice: 600, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-3', serviceId: 'service-1', name: 'Dress', basePrice: 800, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-4', serviceId: 'service-1', name: 'Bedsheet', basePrice: 1200, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-5', serviceId: 'service-1', name: 'Towel', basePrice: 300, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-6', serviceId: 'service-1', name: 'Bulk Laundry', basePrice: 2000, unit: 'kg', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },

  // Dry Cleaning Categories
  { id: 'cat-7', serviceId: 'service-2', name: 'Suit', basePrice: 2500, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-8', serviceId: 'service-2', name: 'Blazer', basePrice: 1500, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-9', serviceId: 'service-2', name: 'Evening Gown', basePrice: 3000, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-10', serviceId: 'service-2', name: 'Coat', basePrice: 2000, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-11', serviceId: 'service-2', name: 'Curtain', basePrice: 2500, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },

  // Ironing Categories
  { id: 'cat-12', serviceId: 'service-3', name: 'Shirt', basePrice: 300, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-13', serviceId: 'service-3', name: 'Trousers', basePrice: 350, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-14', serviceId: 'service-3', name: 'Dress', basePrice: 500, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-15', serviceId: 'service-3', name: 'Bedsheet', basePrice: 600, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },

  // Wash & Iron Categories
  { id: 'cat-16', serviceId: 'service-4', name: 'Shirt', basePrice: 700, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-17', serviceId: 'service-4', name: 'Trousers', basePrice: 850, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-18', serviceId: 'service-4', name: 'Dress', basePrice: 1200, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 'cat-19', serviceId: 'service-4', name: 'Bedsheet', basePrice: 1600, unit: 'item', isActive: true, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
];

// Link categories to services
mockServices.forEach((service) => {
  service.categories = mockServiceCategories.filter((cat) => cat.serviceId === service.id);
});

// ============================================================================
// SERVICE LEVELS
// ============================================================================

export const mockServiceLevels: ServiceLevelConfig[] = [
  {
    id: 'level-1',
    level: ServiceLevel.STANDARD,
    name: 'Standard',
    priceMultiplier: 100, // 100% (no markup)
    durationHours: 72, // 3 days
    isActive: true,
  },
  {
    id: 'level-2',
    level: ServiceLevel.EXPRESS,
    name: 'Express',
    priceMultiplier: 150, // +50%
    durationHours: 24, // 1 day
    isActive: true,
  },
  {
    id: 'level-3',
    level: ServiceLevel.PREMIUM,
    name: 'Premium',
    priceMultiplier: 200, // +100%
    durationHours: 12, // 12 hours
    isActive: true,
  },
];

// ============================================================================
// PICKUP WINDOWS
// ============================================================================

export const mockPickupWindows: PickupWindow[] = [
  { id: 'pw-1', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', baseFee: 500, rushFee: 1000, isActive: true }, // Monday Morning
  { id: 'pw-2', dayOfWeek: 1, startTime: '13:00', endTime: '17:00', baseFee: 500, rushFee: 1000, isActive: true }, // Monday Afternoon
  { id: 'pw-3', dayOfWeek: 2, startTime: '08:00', endTime: '12:00', baseFee: 500, rushFee: 1000, isActive: true }, // Tuesday Morning
  { id: 'pw-4', dayOfWeek: 2, startTime: '13:00', endTime: '17:00', baseFee: 500, rushFee: 1000, isActive: true }, // Tuesday Afternoon
  { id: 'pw-5', dayOfWeek: 3, startTime: '08:00', endTime: '12:00', baseFee: 500, rushFee: 1000, isActive: true }, // Wednesday Morning
  { id: 'pw-6', dayOfWeek: 3, startTime: '13:00', endTime: '17:00', baseFee: 500, rushFee: 1000, isActive: true }, // Wednesday Afternoon
  { id: 'pw-7', dayOfWeek: 4, startTime: '08:00', endTime: '12:00', baseFee: 500, rushFee: 1000, isActive: true }, // Thursday Morning
  { id: 'pw-8', dayOfWeek: 4, startTime: '13:00', endTime: '17:00', baseFee: 500, rushFee: 1000, isActive: true }, // Thursday Afternoon
  { id: 'pw-9', dayOfWeek: 5, startTime: '08:00', endTime: '12:00', baseFee: 500, rushFee: 1000, isActive: true }, // Friday Morning
  { id: 'pw-10', dayOfWeek: 5, startTime: '13:00', endTime: '17:00', baseFee: 500, rushFee: 1000, isActive: true }, // Friday Afternoon
  { id: 'pw-11', dayOfWeek: 6, startTime: '09:00', endTime: '13:00', baseFee: 750, rushFee: 1500, isActive: true }, // Saturday Morning (higher fee)
];

// ============================================================================
// DELIVERY ZONES
// ============================================================================

export const mockDeliveryZones: DeliveryZone[] = [
  { id: 'zone-1', name: 'Ikoyi', deliveryFee: 1000, rushFee: 2000, radiusKm: 5, isActive: true },
  { id: 'zone-2', name: 'Victoria Island', deliveryFee: 1000, rushFee: 2000, radiusKm: 5, isActive: true },
  { id: 'zone-3', name: 'Lekki Phase 1', deliveryFee: 1500, rushFee: 2500, radiusKm: 10, isActive: true },
  { id: 'zone-4', name: 'Ajah', deliveryFee: 2000, rushFee: 3000, radiusKm: 15, isActive: true },
  { id: 'zone-5', name: 'Ikeja', deliveryFee: 1500, rushFee: 2500, radiusKm: 10, isActive: true },
  { id: 'zone-6', name: 'Yaba', deliveryFee: 1200, rushFee: 2200, radiusKm: 8, isActive: true },
  { id: 'zone-7', name: 'Surulere', deliveryFee: 1200, rushFee: 2200, radiusKm: 8, isActive: true },
  { id: 'zone-8', name: 'Mainland (Others)', deliveryFee: 2500, rushFee: 3500, radiusKm: 20, isActive: true },
];
