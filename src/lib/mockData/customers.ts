import { Customer, CustomerStatus, CustomerWallet, WalletTransaction, LoyaltyTier } from '@/types';

// ============================================================================
// LOYALTY TIERS
// ============================================================================

export const mockLoyaltyTiers: LoyaltyTier[] = [
  {
    id: 'tier-1',
    name: 'Bronze',
    pointsRequired: 0,
    multiplier: 100, // 100% (base earning rate)
    rank: 1,
    benefits: {
      freePickup: false,
      freeDelivery: false,
      priorityTurnaround: false,
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-2',
    name: 'Silver',
    pointsRequired: 1000,
    multiplier: 125, // +25% points
    rank: 2,
    benefits: {
      freePickup: true,
      freeDelivery: false,
      priorityTurnaround: false,
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-3',
    name: 'Gold',
    pointsRequired: 5000,
    multiplier: 150, // +50% points
    rank: 3,
    benefits: {
      freePickup: true,
      freeDelivery: true,
      priorityTurnaround: false,
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tier-4',
    name: 'Platinum',
    pointsRequired: 15000,
    multiplier: 200, // +100% points
    rank: 4,
    benefits: {
      freePickup: true,
      freeDelivery: true,
      priorityTurnaround: true,
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateReferralCode(name: string): string {
  return name.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createCustomerWallet(customerId: string, balance: number): CustomerWallet {
  return {
    id: `wallet-${customerId}`,
    customerId,
    balance,
    currency: 'NGN',
    transactions: [],
  };
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Adebayo Johnson',
    email: 'adebayo.johnson@email.com',
    phone: '+234 803 456 7890',
    address: '15 Banana Island Road, Ikoyi, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-4',
    loyaltyPoints: 18500,
    walletId: 'wallet-cust-1',
    referralCode: generateReferralCode('Adebayo'),
    totalOrders: 45,
    totalSpent: 387500,
    lastOrderDate: '2024-02-08T14:30:00Z',
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-02-08T14:30:00Z',
  },
  {
    id: 'cust-2',
    name: 'Chioma Okafor',
    email: 'chioma.okafor@email.com',
    phone: '+234 816 789 0123',
    address: '23 Admiralty Way, Lekki Phase 1, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-3',
    loyaltyPoints: 7850,
    walletId: 'wallet-cust-2',
    referralCode: generateReferralCode('Chioma'),
    totalOrders: 28,
    totalSpent: 245000,
    lastOrderDate: '2024-02-10T10:15:00Z',
    createdAt: '2023-08-20T00:00:00Z',
    updatedAt: '2024-02-10T10:15:00Z',
  },
  {
    id: 'cust-3',
    name: 'Ibrahim Musa',
    email: 'ibrahim.musa@email.com',
    phone: '+234 809 234 5678',
    address: '47 Adeola Odeku Street, Victoria Island, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-2',
    loyaltyPoints: 2340,
    walletId: 'wallet-cust-3',
    referralCode: generateReferralCode('Ibrahim'),
    totalOrders: 15,
    totalSpent: 128000,
    lastOrderDate: '2024-02-09T16:45:00Z',
    createdAt: '2023-11-10T00:00:00Z',
    updatedAt: '2024-02-09T16:45:00Z',
  },
  {
    id: 'cust-4',
    name: 'Funke Adeleke',
    email: 'funke.adeleke@email.com',
    phone: '+234 817 345 6789',
    address: '12 Freedom Way, Ikeja GRA, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-3',
    loyaltyPoints: 6200,
    walletId: 'wallet-cust-4',
    referralCode: generateReferralCode('Funke'),
    totalOrders: 22,
    totalSpent: 198500,
    lastOrderDate: '2024-02-11T09:20:00Z',
    createdAt: '2023-07-05T00:00:00Z',
    updatedAt: '2024-02-11T09:20:00Z',
  },
  {
    id: 'cust-5',
    name: 'Oluwaseun Bakare',
    email: 'seun.bakare@email.com',
    phone: '+234 805 678 9012',
    address: '8 Chevron Drive, Lekki, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-1',
    loyaltyPoints: 450,
    walletId: 'wallet-cust-5',
    referralCode: generateReferralCode('Oluwaseun'),
    totalOrders: 5,
    totalSpent: 42000,
    lastOrderDate: '2024-02-07T13:10:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-02-07T13:10:00Z',
  },
  {
    id: 'cust-6',
    name: 'Ngozi Eze',
    email: 'ngozi.eze@email.com',
    phone: '+234 813 890 1234',
    address: '34 Allen Avenue, Ikeja, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-2',
    loyaltyPoints: 3100,
    walletId: 'wallet-cust-6',
    referralCode: generateReferralCode('Ngozi'),
    totalOrders: 18,
    totalSpent: 156000,
    lastOrderDate: '2024-02-06T11:30:00Z',
    createdAt: '2023-09-12T00:00:00Z',
    updatedAt: '2024-02-06T11:30:00Z',
  },
  {
    id: 'cust-7',
    name: 'Tunde Balogun',
    email: 'tunde.balogun@email.com',
    phone: '+234 806 123 4567',
    address: '19 Norman Williams Street, Ikoyi, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-3',
    loyaltyPoints: 9500,
    walletId: 'wallet-cust-7',
    referralCode: generateReferralCode('Tunde'),
    totalOrders: 35,
    totalSpent: 298000,
    lastOrderDate: '2024-02-10T15:00:00Z',
    createdAt: '2023-05-20T00:00:00Z',
    updatedAt: '2024-02-10T15:00:00Z',
  },
  {
    id: 'cust-8',
    name: 'Amaka Nwankwo',
    email: 'amaka.nwankwo@email.com',
    phone: '+234 814 567 8901',
    address: '27 Glover Road, Ikoyi, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-2',
    loyaltyPoints: 1850,
    walletId: 'wallet-cust-8',
    referralCode: generateReferralCode('Amaka'),
    totalOrders: 12,
    totalSpent: 95000,
    lastOrderDate: '2024-02-05T10:00:00Z',
    createdAt: '2023-10-08T00:00:00Z',
    updatedAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'cust-9',
    name: 'Mohammed Yusuf',
    email: 'mohammed.yusuf@email.com',
    phone: '+234 807 890 1234',
    address: '45 Osborne Road, Ikoyi, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-4',
    loyaltyPoints: 16200,
    walletId: 'wallet-cust-9',
    referralCode: generateReferralCode('Mohammed'),
    totalOrders: 52,
    totalSpent: 425000,
    lastOrderDate: '2024-02-11T08:45:00Z',
    createdAt: '2023-04-10T00:00:00Z',
    updatedAt: '2024-02-11T08:45:00Z',
  },
  {
    id: 'cust-10',
    name: 'Blessing Okonkwo',
    email: 'blessing.okonkwo@email.com',
    phone: '+234 815 234 5678',
    address: '11 Bourdillon Road, Ikoyi, Lagos',
    status: CustomerStatus.ACTIVE,
    loyaltyTierId: 'tier-1',
    loyaltyPoints: 720,
    walletId: 'wallet-cust-10',
    referralCode: generateReferralCode('Blessing'),
    totalOrders: 8,
    totalSpent: 65000,
    lastOrderDate: '2024-02-09T12:20:00Z',
    createdAt: '2023-12-05T00:00:00Z',
    updatedAt: '2024-02-09T12:20:00Z',
  },
  // Additional customers (11-30)
  ...Array.from({ length: 20 }, (_, i) => {
    const id = `cust-${i + 11}`;
    const names = [
      'Chukwuma Obi', 'Aisha Abdullahi', 'Emeka Nnamdi', 'Fatima Hassan',
      'Kunle Adeyemi', 'Zainab Mohammed', 'Chidi Okoro', 'Hauwa Garba',
      'Biodun Alabi', 'Khadija Ibrahim', 'Femi Oladipo', 'Hadiza Bello',
      'Tosin Ajayi', 'Maryam Usman', 'Wale Ogunleye', 'Salamatu Sani',
      'Bola Awolowo', 'Rashida Ahmad', 'Kola Osho', 'Zara Yusuf'
    ];
    const areas = [
      'Ajah', 'Surulere', 'Yaba', 'Maryland', 'Festac', 'Gbagada',
      'Apapa', 'Magodo', 'Ojota', 'Anthony', 'Berger', 'Isolo',
      'Oshodi', 'Mushin', 'Orile', 'Ajegunle', 'Ojo', 'Badagry',
      'Epe', 'Sangotedo'
    ];

    const totalOrders = Math.floor(Math.random() * 40) + 5;
    const totalSpent = totalOrders * (Math.random() * 10000 + 5000);
    const loyaltyPoints = Math.floor(totalSpent * 0.1 * (Math.random() * 0.5 + 0.75));

    let loyaltyTierId = 'tier-1';
    if (loyaltyPoints >= 15000) loyaltyTierId = 'tier-4';
    else if (loyaltyPoints >= 5000) loyaltyTierId = 'tier-3';
    else if (loyaltyPoints >= 1000) loyaltyTierId = 'tier-2';

    return {
      id,
      name: names[i],
      email: `${names[i].toLowerCase().replace(/ /g, '.')}@email.com`,
      phone: `+234 ${800 + Math.floor(Math.random() * 20)} ${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
      address: `${Math.floor(Math.random() * 100) + 1} ${areas[i]} Street, Lagos`,
      status: Math.random() > 0.1 ? CustomerStatus.ACTIVE : CustomerStatus.SUSPENDED,
      loyaltyTierId,
      loyaltyPoints,
      walletId: `wallet-${id}`,
      referralCode: generateReferralCode(names[i]),
      totalOrders,
      totalSpent: Math.floor(totalSpent),
      lastOrderDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }),
];

// ============================================================================
// CUSTOMER WALLETS
// ============================================================================

export const mockWallets: CustomerWallet[] = mockCustomers.map((customer, index) => {
  const balances = [5000, 12000, 3000, 8500, 1500, 6000, 15000, 2500, 10000, 4000];
  return createCustomerWallet(
    customer.id,
    balances[index] || Math.floor(Math.random() * 20000)
  );
});

// Link wallets to customers
mockCustomers.forEach((customer) => {
  customer.wallet = mockWallets.find((w) => w.customerId === customer.id);
  customer.loyaltyTier = mockLoyaltyTiers.find((t) => t.id === customer.loyaltyTierId);
});
