import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceLevel,
} from '@/types';
import { mockCustomers } from './customers';
import { mockStaff } from './staff';
import { mockServiceCategories } from './services';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function generateOrderCode(): string {
  return `RLX-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
}

function createOrderItem(
  serviceId: string,
  serviceName: string,
  categoryId: string,
  categoryName: string,
  quantity: number,
  basePrice: number,
  serviceLevel: ServiceLevel
): OrderItem {
  const multipliers: Record<ServiceLevel, number> = {
    [ServiceLevel.STANDARD]: 1.0,
    [ServiceLevel.EXPRESS]: 1.5,
    [ServiceLevel.PREMIUM]: 2.0,
  };

  const multiplier = multipliers[serviceLevel];
  const subtotal = basePrice * quantity * multiplier;

  return {
    id: `item-${Date.now()}-${Math.random()}`,
    serviceId,
    serviceName,
    categoryId,
    categoryName,
    quantity,
    unit: 'item',
    basePrice,
    serviceLevel,
    serviceLevelMultiplier: multiplier,
    subtotal,
  };
}

// ============================================================================
// ORDERS
// ============================================================================

export const mockOrders: Order[] = [
  // Order 1 - COMPLETED
  {
    id: 'order-1',
    orderNumber: 'ORD-2024021101',
    code: 'RLX-000001',
    customerId: 'cust-1',
    customer: mockCustomers[0],
    items: [
      createOrderItem('service-1', 'Wash & Fold', 'cat-1', 'Shirt', 5, 500, ServiceLevel.STANDARD),
      createOrderItem('service-1', 'Wash & Fold', 'cat-2', 'Trousers', 3, 600, ServiceLevel.STANDARD),
    ],
    status: OrderStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.WALLET,
    subtotal: 4300,
    serviceLevelCharge: 0,
    pickupFee: 500,
    deliveryFee: 1000,
    rushFee: 0,
    discount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    total: 5800,
    amountPaid: 5800,
    pickupWindowId: 'pw-1',
    deliveryZoneId: 'zone-1',
    pickupAddress: '15 Banana Island Road, Ikoyi, Lagos',
    deliveryAddress: '15 Banana Island Road, Ikoyi, Lagos',
    estimatedPickupDate: '2024-02-05T10:00:00Z',
    actualPickupDate: '2024-02-05T10:15:00Z',
    estimatedDeliveryDate: '2024-02-08T16:00:00Z',
    actualDeliveryDate: '2024-02-08T15:45:00Z',
    assignedToId: 'user-7',
    assignedTo: mockStaff[6],
    addOns: {
      stainRemoval: false,
      rushService: false,
      pickup: true,
      delivery: true,
    },
    notes: 'Handle with care',
    photoUrls: [],
    createdAt: '2024-02-04T14:30:00Z',
    updatedAt: '2024-02-08T15:45:00Z',
    createdById: 'user-5',
    createdBy: mockStaff[4],
  },

  // Order 2 - IN_PROGRESS
  {
    id: 'order-2',
    orderNumber: 'ORD-2024021102',
    code: 'RLX-000002',
    customerId: 'cust-2',
    customer: mockCustomers[1],
    items: [
      createOrderItem('service-2', 'Dry Cleaning', 'cat-7', 'Suit', 2, 2500, ServiceLevel.EXPRESS),
      createOrderItem('service-2', 'Dry Cleaning', 'cat-9', 'Evening Gown', 1, 3000, ServiceLevel.EXPRESS),
    ],
    status: OrderStatus.IN_PROGRESS,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.PAYSTACK,
    paymentReference: 'PST-20240211-123456',
    subtotal: 12000,
    serviceLevelCharge: 6000, // 50% of subtotal for EXPRESS
    pickupFee: 500,
    deliveryFee: 1500,
    rushFee: 0,
    discount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    total: 20000,
    amountPaid: 20000,
    pickupWindowId: 'pw-3',
    deliveryZoneId: 'zone-3',
    pickupAddress: '23 Admiralty Way, Lekki Phase 1, Lagos',
    deliveryAddress: '23 Admiralty Way, Lekki Phase 1, Lagos',
    estimatedPickupDate: '2024-02-10T09:00:00Z',
    actualPickupDate: '2024-02-10T09:20:00Z',
    estimatedDeliveryDate: '2024-02-11T18:00:00Z',
    assignedToId: 'user-8',
    assignedTo: mockStaff[7],
    addOns: {
      stainRemoval: true,
      rushService: false,
      pickup: true,
      delivery: true,
    },
    notes: 'Red wine stain on suit jacket',
    internalNotes: 'Use premium stain remover',
    photoUrls: ['/uploads/order-2-stain.jpg'],
    createdAt: '2024-02-09T16:45:00Z',
    updatedAt: '2024-02-11T10:00:00Z',
    createdById: 'user-5',
    createdBy: mockStaff[4],
  },

  // Order 3 - PENDING
  {
    id: 'order-3',
    orderNumber: 'ORD-2024021103',
    code: 'RLX-000003',
    customerId: 'cust-3',
    customer: mockCustomers[2],
    items: [
      createOrderItem('service-4', 'Wash & Iron', 'cat-16', 'Shirt', 10, 700, ServiceLevel.STANDARD),
    ],
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CASH,
    subtotal: 7000,
    serviceLevelCharge: 0,
    pickupFee: 0, // Customer drop-off
    deliveryFee: 1000,
    rushFee: 0,
    discount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    total: 8000,
    amountPaid: 0,
    deliveryZoneId: 'zone-2',
    deliveryAddress: '47 Adeola Odeku Street, Victoria Island, Lagos',
    estimatedDeliveryDate: '2024-02-14T16:00:00Z',
    addOns: {
      stainRemoval: false,
      rushService: false,
      pickup: false,
      delivery: true,
    },
    notes: 'Customer will drop off',
    photoUrls: [],
    createdAt: '2024-02-11T09:20:00Z',
    updatedAt: '2024-02-11T09:20:00Z',
    createdById: 'user-6',
    createdBy: mockStaff[5],
  },

  // Order 4 - READY
  {
    id: 'order-4',
    orderNumber: 'ORD-2024021104',
    code: 'RLX-000004',
    customerId: 'cust-4',
    customer: mockCustomers[3],
    items: [
      createOrderItem('service-1', 'Wash & Fold', 'cat-4', 'Bedsheet', 4, 1200, ServiceLevel.EXPRESS),
      createOrderItem('service-1', 'Wash & Fold', 'cat-5', 'Towel', 8, 300, ServiceLevel.EXPRESS),
    ],
    status: OrderStatus.READY,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.WALLET,
    subtotal: 8400,
    serviceLevelCharge: 4200,
    pickupFee: 500,
    deliveryFee: 1500,
    rushFee: 0,
    discount: 840, // 10% discount
    promoCodeId: 'promo-1',
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    total: 13760,
    amountPaid: 13760,
    pickupWindowId: 'pw-5',
    deliveryZoneId: 'zone-3',
    pickupAddress: '12 Freedom Way, Ikeja GRA, Lagos',
    deliveryAddress: '12 Freedom Way, Ikeja GRA, Lagos',
    estimatedPickupDate: '2024-02-08T10:00:00Z',
    actualPickupDate: '2024-02-08T10:30:00Z',
    estimatedDeliveryDate: '2024-02-11T16:00:00Z',
    assignedToId: 'user-9',
    assignedTo: mockStaff[8],
    addOns: {
      stainRemoval: false,
      rushService: false,
      pickup: true,
      delivery: true,
    },
    photoUrls: [],
    createdAt: '2024-02-07T13:10:00Z',
    updatedAt: '2024-02-11T11:00:00Z',
    createdById: 'user-5',
    createdBy: mockStaff[4],
  },

  // Order 5 - OUT_FOR_DELIVERY
  {
    id: 'order-5',
    orderNumber: 'ORD-2024021105',
    code: 'RLX-000005',
    customerId: 'cust-5',
    customer: mockCustomers[4],
    items: [
      createOrderItem('service-3', 'Ironing', 'cat-12', 'Shirt', 6, 300, ServiceLevel.STANDARD),
      createOrderItem('service-3', 'Ironing', 'cat-13', 'Trousers', 4, 350, ServiceLevel.STANDARD),
    ],
    status: OrderStatus.OUT_FOR_DELIVERY,
    paymentStatus: PaymentStatus.PAID,
    paymentMethod: PaymentMethod.TRANSFER,
    paymentReference: 'TRF-20240210-789012',
    subtotal: 3200,
    serviceLevelCharge: 0,
    pickupFee: 500,
    deliveryFee: 1500,
    rushFee: 0,
    discount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscountAmount: 0,
    total: 5200,
    amountPaid: 5200,
    pickupWindowId: 'pw-6',
    deliveryZoneId: 'zone-3',
    pickupAddress: '8 Chevron Drive, Lekki, Lagos',
    deliveryAddress: '8 Chevron Drive, Lekki, Lagos',
    estimatedPickupDate: '2024-02-09T14:00:00Z',
    actualPickupDate: '2024-02-09T14:15:00Z',
    estimatedDeliveryDate: '2024-02-11T15:00:00Z',
    assignedToId: 'user-10',
    assignedTo: mockStaff[9],
    addOns: {
      stainRemoval: false,
      rushService: false,
      pickup: true,
      delivery: true,
    },
    photoUrls: [],
    createdAt: '2024-02-08T11:30:00Z',
    updatedAt: '2024-02-11T13:00:00Z',
    createdById: 'user-6',
    createdBy: mockStaff[5],
  },

  // Generate additional orders (6-50)
  ...Array.from({ length: 45 }, (_, i) => {
    const orderNum = i + 6;
    const customerId = `cust-${(i % 10) + 1}`;
    const customer = mockCustomers.find((c) => c.id === customerId)!;
    const staffId = `user-${(i % 14) + 7}`;
    const assignedStaff = mockStaff.find((s) => s.id === staffId);

    const statuses = [
      OrderStatus.PENDING,
      OrderStatus.PENDING_PICKUP,
      OrderStatus.IN_TRANSIT_TO_FACILITY,
      OrderStatus.IN_PROGRESS,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ];

    const paymentMethods = [
      PaymentMethod.WALLET,
      PaymentMethod.PAYSTACK,
      PaymentMethod.CASH,
      PaymentMethod.POS,
      PaymentMethod.TRANSFER,
    ];

    const serviceLevels = [ServiceLevel.STANDARD, ServiceLevel.EXPRESS, ServiceLevel.PREMIUM];

    const status = statuses[i % statuses.length];
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const serviceLevel = serviceLevels[i % serviceLevels.length];

    const paymentStatus =
      status === OrderStatus.PENDING || status === OrderStatus.PENDING_PICKUP
        ? PaymentStatus.PENDING
        : status === OrderStatus.CANCELLED
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PAID;

    // Random items
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items: OrderItem[] = [];
    for (let j = 0; j < itemCount; j++) {
      const category = mockServiceCategories[Math.floor(Math.random() * mockServiceCategories.length)];
      items.push(
        createOrderItem(
          category.serviceId,
          category.serviceId === 'service-1'
            ? 'Wash & Fold'
            : category.serviceId === 'service-2'
            ? 'Dry Cleaning'
            : category.serviceId === 'service-3'
            ? 'Ironing'
            : 'Wash & Iron',
          category.id,
          category.name,
          Math.floor(Math.random() * 5) + 1,
          category.basePrice,
          serviceLevel
        )
      );
    }

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const serviceLevelCharge =
      serviceLevel === ServiceLevel.EXPRESS
        ? subtotal * 0.5
        : serviceLevel === ServiceLevel.PREMIUM
        ? subtotal * 1.0
        : 0;
    const pickupFee = Math.random() > 0.3 ? 500 : 0;
    const deliveryFee = Math.random() > 0.2 ? [1000, 1500, 2000][Math.floor(Math.random() * 3)] : 0;
    const total = subtotal + serviceLevelCharge + pickupFee + deliveryFee;

    const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

    return {
      id: `order-${orderNum}`,
      orderNumber: `ORD-202402${orderNum.toString().padStart(4, '0')}`,
      code: `RLX-${orderNum.toString().padStart(6, '0')}`,
      customerId,
      customer,
      items,
      status,
      paymentStatus,
      paymentMethod,
      paymentReference:
        paymentMethod === PaymentMethod.PAYSTACK
          ? `PST-${Date.now()}`
          : paymentMethod === PaymentMethod.TRANSFER
          ? `TRF-${Date.now()}`
          : paymentMethod === PaymentMethod.POS
          ? `POS-${Date.now()}`
          : undefined,
      subtotal,
      serviceLevelCharge,
      pickupFee,
      deliveryFee,
      rushFee: 0,
      discount: 0,
      loyaltyPointsRedeemed: 0,
      loyaltyDiscountAmount: 0,
      total,
      amountPaid: paymentStatus === PaymentStatus.PAID ? total : 0,
      pickupWindowId: pickupFee > 0 ? `pw-${(i % 11) + 1}` : undefined,
      deliveryZoneId: deliveryFee > 0 ? `zone-${(i % 8) + 1}` : undefined,
      pickupAddress: pickupFee > 0 ? customer.address : undefined,
      deliveryAddress: deliveryFee > 0 ? customer.address : undefined,
      estimatedPickupDate: pickupFee > 0 ? new Date(createdDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      actualPickupDate:
        status !== OrderStatus.PENDING && pickupFee > 0
          ? new Date(createdDate.getTime() + 25 * 60 * 60 * 1000).toISOString()
          : undefined,
      estimatedDeliveryDate: deliveryFee > 0 ? new Date(createdDate.getTime() + 72 * 60 * 60 * 1000).toISOString() : undefined,
      actualDeliveryDate:
        status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED
          ? new Date(createdDate.getTime() + 70 * 60 * 60 * 1000).toISOString()
          : undefined,
      assignedToId: status !== OrderStatus.PENDING ? staffId : undefined,
      assignedTo: status !== OrderStatus.PENDING ? assignedStaff : undefined,
      addOns: {
        stainRemoval: Math.random() > 0.8,
        rushService: Math.random() > 0.9,
        pickup: pickupFee > 0,
        delivery: deliveryFee > 0,
      },
      notes: '',
      photoUrls: [],
      createdAt: createdDate.toISOString(),
      updatedAt: new Date().toISOString(),
      createdById: 'user-5',
      createdBy: mockStaff[4],
    } as Order;
  }),
];
