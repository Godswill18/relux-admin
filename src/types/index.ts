// ============================================================================
// RELUX LAUNDRY MANAGEMENT SYSTEM - TYPE DEFINITIONS
// ============================================================================

// ----------------------------------------------------------------------------
// ENUMS
// ----------------------------------------------------------------------------

export enum OrderStatus {
  PENDING = 'PENDING',
  PENDING_PICKUP = 'PENDING_PICKUP',
  IN_TRANSIT_TO_FACILITY = 'IN_TRANSIT_TO_FACILITY',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  WALLET = 'WALLET',
  PAYSTACK = 'PAYSTACK',
  CASH = 'CASH',
  POS = 'POS',
  TRANSFER = 'TRANSFER',
  LENCO = 'LENCO',
}

export enum CustomerStatus {
  GUEST = 'GUEST',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ServiceLevel {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  PAST_DUE = 'PAST_DUE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  QUALIFIED = 'QUALIFIED',
  REWARDED = 'REWARDED',
  REVERSED = 'REVERSED',
  REJECTED = 'REJECTED',
}

export enum PromoCodeType {
  FIXED = 'FIXED',
  PERCENT = 'PERCENT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
}

export enum AttendanceSource {
  APP = 'APP',
  QR = 'QR',
  MANUAL = 'MANUAL',
}

export enum PayType {
  HOURLY = 'HOURLY',
  MONTHLY = 'MONTHLY',
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID',
}

export enum ChatThreadStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum MessageSender {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
}

export enum NotificationType {
  ORDER_UPDATE = 'ORDER_UPDATE',
  PAYMENT = 'PAYMENT',
  LOYALTY = 'LOYALTY',
  REFERRAL = 'REFERRAL',
  SUBSCRIPTION = 'SUBSCRIPTION',
  CHAT = 'CHAT',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  IN_APP = 'IN_APP',
}

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  ADJUST = 'ADJUST',
  REVERSAL = 'REVERSAL',
}

export enum Permission {
  // Order permissions
  VIEW_ORDERS = 'VIEW_ORDERS',
  CREATE_ORDER = 'CREATE_ORDER',
  EDIT_ORDER = 'EDIT_ORDER',
  DELETE_ORDER = 'DELETE_ORDER',
  ASSIGN_STAFF = 'ASSIGN_STAFF',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',

  // Customer permissions
  VIEW_CUSTOMERS = 'VIEW_CUSTOMERS',
  CREATE_CUSTOMER = 'CREATE_CUSTOMER',
  EDIT_CUSTOMER = 'EDIT_CUSTOMER',
  DELETE_CUSTOMER = 'DELETE_CUSTOMER',
  MANAGE_WALLET = 'MANAGE_WALLET',
  MANAGE_LOYALTY = 'MANAGE_LOYALTY',

  // Service permissions
  VIEW_SERVICES = 'VIEW_SERVICES',
  MANAGE_SERVICES = 'MANAGE_SERVICES',
  MANAGE_PRICING = 'MANAGE_PRICING',

  // Payment permissions
  VIEW_PAYMENTS = 'VIEW_PAYMENTS',
  CONFIRM_PAYMENT = 'CONFIRM_PAYMENT',
  PROCESS_REFUND = 'PROCESS_REFUND',
  MANAGE_PAYMENT_SETTINGS = 'MANAGE_PAYMENT_SETTINGS',

  // Staff permissions
  VIEW_STAFF = 'VIEW_STAFF',
  CREATE_STAFF = 'CREATE_STAFF',
  EDIT_STAFF = 'EDIT_STAFF',
  DELETE_STAFF = 'DELETE_STAFF',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',

  // Shift & Attendance permissions
  VIEW_SHIFTS = 'VIEW_SHIFTS',
  MANAGE_SHIFTS = 'MANAGE_SHIFTS',
  VIEW_ATTENDANCE = 'VIEW_ATTENDANCE',
  MANAGE_ATTENDANCE = 'MANAGE_ATTENDANCE',
  CLOCK_IN_OUT = 'CLOCK_IN_OUT',

  // Payroll permissions
  VIEW_PAYROLL = 'VIEW_PAYROLL',
  MANAGE_PAYROLL = 'MANAGE_PAYROLL',
  GENERATE_PAYSLIPS = 'GENERATE_PAYSLIPS',
  VIEW_OWN_PAYSLIP = 'VIEW_OWN_PAYSLIP',

  // Chat permissions
  VIEW_CHAT = 'VIEW_CHAT',
  RESPOND_CHAT = 'RESPOND_CHAT',
  ASSIGN_CHAT = 'ASSIGN_CHAT',
  CLOSE_CHAT = 'CLOSE_CHAT',

  // Report permissions
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // System permissions
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_PROMO_CODES = 'MANAGE_PROMO_CODES',
  MANAGE_SUBSCRIPTIONS = 'MANAGE_SUBSCRIPTIONS',
  MANAGE_LOYALTY_PROGRAM = 'MANAGE_LOYALTY_PROGRAM',
  MANAGE_REFERRAL_PROGRAM = 'MANAGE_REFERRAL_PROGRAM',
  SEND_NOTIFICATIONS = 'SEND_NOTIFICATIONS',
}

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  RECEPTIONIST = 'RECEPTIONIST',
  DELIVERY = 'DELIVERY',
}

// ----------------------------------------------------------------------------
// USER & AUTH
// ----------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  permissions: Permission[];
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ----------------------------------------------------------------------------
// ORDERS
// ----------------------------------------------------------------------------

export interface OrderItem {
  id: string;
  serviceId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  unit: 'item' | 'kg' | 'bundle';
  basePrice: number;
  serviceLevel: ServiceLevel;
  serviceLevelMultiplier: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  code: string; // Customer-facing code (e.g., "RLX-001234")
  customerId: string;
  customer: Customer;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;

  // Pricing
  subtotal: number;
  serviceLevelCharge: number;
  pickupFee: number;
  deliveryFee: number;
  rushFee: number;
  discount: number;
  promoCodeId?: string;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountAmount: number;
  total: number;
  amountPaid: number;

  // Logistics
  pickupWindowId?: string;
  deliveryZoneId?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  estimatedPickupDate?: string;
  actualPickupDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;

  // Staff assignment
  assignedToId?: string;
  assignedTo?: User;

  // Add-ons
  addOns: {
    stainRemoval: boolean;
    rushService: boolean;
    pickup: boolean;
    delivery: boolean;
  };

  // Notes & attachments
  notes?: string;
  internalNotes?: string;
  photoUrls: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: User;
}

// ----------------------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------------------

export interface CustomerWallet {
  id: string;
  customerId: string;
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance: number; // Balance after transaction
  reference: string;
  description: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  status: CustomerStatus;

  // Loyalty
  loyaltyTierId?: string;
  loyaltyTier?: LoyaltyTier;
  loyaltyPoints: number;

  // Wallet
  walletId: string;
  wallet?: CustomerWallet;

  // Subscription
  subscriptionId?: string;
  subscription?: Subscription;

  // Referral
  referralCode: string;
  referredById?: string;

  // Stats
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// SERVICES & PRICING
// ----------------------------------------------------------------------------

export interface Service {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  categories: ServiceCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  serviceId: string;
  name: string;
  basePrice: number;
  unit: 'item' | 'kg' | 'bundle';
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceLevelConfig {
  id: string;
  level: ServiceLevel;
  name: string;
  priceMultiplier: number; // Percentage (e.g., 150 for +50%)
  durationHours: number;
  isActive: boolean;
}

export interface PickupWindow {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string;
  baseFee: number;
  rushFee: number;
  isActive: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  deliveryFee: number;
  rushFee: number;
  radiusKm: number;
  isActive: boolean;
}

// ----------------------------------------------------------------------------
// PAYMENTS
// ----------------------------------------------------------------------------

export interface PaymentTransaction {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference?: string;
  paystackReference?: string;
  lencoReference?: string;
  confirmedById?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSettings {
  wallet: {
    enabled: boolean;
    minTopUp: number;
    maxTopUp: number;
    autoPayEnabled: boolean;
  };
  paystack: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
  };
  lenco: {
    enabled: boolean;
    apiKey: string;
  };
  cash: {
    enabled: boolean;
    requiresConfirmation: boolean;
    requiresReference: boolean;
  };
  pos: {
    enabled: boolean;
    requiresConfirmation: boolean;
    requiresReference: boolean;
  };
  transfer: {
    enabled: boolean;
    requiresConfirmation: boolean;
    requiresReference: boolean;
  };
}

// ----------------------------------------------------------------------------
// LOYALTY PROGRAM
// ----------------------------------------------------------------------------

export interface LoyaltyTier {
  id: string;
  _id?: string;
  name: string;
  pointsRequired: number;
  minSpend?: number;
  multiplier: number;
  multiplierPercent?: number;
  rank: number;
  discountPercent: number;
  freePickup: boolean;
  freeDelivery: boolean;
  priorityTurnaround: boolean;
  benefits?: {
    freePickup: boolean;
    freeDelivery: boolean;
    priorityTurnaround: boolean;
  };
  active?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltySettings {
  enabled: boolean;
  redemptionEnabled: boolean;
  pointsPerCurrency: number; // Points earned per currency spent
  redemptionRate: number; // Currency value per point
  minOrderAmount: number; // Minimum order to earn points
  maxPointsPerOrder: number;
  maxPointsPerDay: number;
  minRedeemPoints: number;
  maxRedeemPercentage: number; // Max % of order that can be paid with points
  qualificationTrigger: 'PAID' | 'COMPLETED';

  // Bonuses
  serviceLevelBonus: {
    standard: number; // Percentage bonus
    express: number;
    premium: number;
  };
  firstOrderBonus: number;
  secondOrderBonus: number;
  weekendMultiplier: number;
  addOnBonus: {
    stainRemoval: number;
    rushService: number;
    pickup: number;
    delivery: number;
  };

  allowWithSubscription: boolean;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: LoyaltyTransactionType;
  points: number;
  balance: number; // Balance after transaction
  orderId?: string;
  reason: string;
  createdById?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// REFERRAL PROGRAM
// ----------------------------------------------------------------------------

export interface ReferralSettings {
  enabled: boolean;
  referrerRewardAmount: number; // Wallet credit
  refereeRewardAmount: number;
  referrerLoyaltyPoints: number;
  refereeLoyaltyPoints: number;
  minOrderCount: number; // For qualification
  minOrderAmount: number;
  qualificationTrigger: 'PAID' | 'COMPLETED';
  maxRewardsPerReferrer: number;
  allowSelfReferral: boolean;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrer?: Customer;
  refereeId: string;
  referee?: Customer;
  status: ReferralStatus;
  referrerRewardedAmount: number;
  refereeRewardedAmount: number;
  referrerLoyaltyPoints: number;
  refereeLoyaltyPoints: number;
  qualifyingOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// SUBSCRIPTIONS
// ----------------------------------------------------------------------------

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  itemLimit: number; // Number of items per period
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  plan?: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  nextBillingDate?: string;
  itemsUsed: number;
  paystackSubscriptionCode?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// PROMO CODES
// ----------------------------------------------------------------------------

export interface PromoCode {
  id: string;
  code: string;
  type: PromoCodeType;
  value: number; // Amount for FIXED, percentage for PERCENT
  usageLimit: number;
  usageCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// STAFF MANAGEMENT
// ----------------------------------------------------------------------------

export interface Staff {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: Role | string;
  staffRole?: string;
  isActive: boolean;
  address?: string;
  city?: string;
  dateOfBirth?: string;
  hireDate?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffCompensation {
  id: string;
  userId: string;
  payType: PayType;
  hourlyRate?: number;
  overtimeRate?: number;
  monthlySalary?: number;
  bonusPerOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// SHIFTS & ATTENDANCE
// ----------------------------------------------------------------------------

export interface Shift {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  assignedToId: string;
  assignedTo?: User;
  notes?: string;
  qrCode?: string; // For clock-in/out
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  shiftId?: string;
  clockInTime: string;
  clockOutTime?: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  location?: {
    latitude: number;
    longitude: number;
  };
  ipAddress?: string;
  deviceInfo?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// PAYROLL
// ----------------------------------------------------------------------------

export interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  totalAmount: number;
  entries: PayrollEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollEntry {
  id: string;
  periodId: string;
  userId: string;
  user?: User;

  // Hours
  baseHours: number;
  overtimeHours: number;

  // Rates
  hourlyRate: number;
  overtimeRate: number;

  // Amounts
  baseAmount: number;
  overtimeAmount: number;
  bonuses: number;
  deductions: number;
  totalAmount: number;

  // Attendance
  attendanceCount: number;
  lateCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  entryId: string;
  entry?: PayrollEntry;
  pdfUrl?: string;
  emailedAt?: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// CHAT & NOTIFICATIONS
// ----------------------------------------------------------------------------

export interface ChatThread {
  id: string;
  customerId: string;
  customer?: Customer;
  orderId?: string;
  order?: Order;
  status: ChatThreadStatus;
  assignedToId?: string;
  assignedTo?: User;
  messages: Message[];
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderType: MessageSender;
  sender?: User | Customer;
  message: string;
  attachments: string[];
  isInternalNote: boolean; // Not visible to customer
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  orderId?: string;
  customerId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  [key: string]: {
    enabled: boolean;
    channels: NotificationChannel[];
  };
}

// ----------------------------------------------------------------------------
// REPORTS & AUDIT
// ----------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  userId: string;
  user?: User;
  action: string; // e.g., "CREATE_ORDER", "UPDATE_CUSTOMER"
  target: string; // e.g., "Order", "Customer"
  targetId: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RevenueReport {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  byPaymentMethod: Record<PaymentMethod, number>;
  byServiceLevel: Record<ServiceLevel, number>;
  trend: {
    date: string;
    revenue: number;
    orders: number;
  }[];
}

// ----------------------------------------------------------------------------
// SYSTEM SETTINGS
// ----------------------------------------------------------------------------

export interface SystemSettings {
  business: {
    name: string;
    logoUrl?: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
  general: {
    currency: string;
    timezone: string;
    dateFormat: string;
    taxRate: number;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromName: string;
    fromEmail: string;
  };
  sms: {
    provider: 'TWILIO' | 'AFRICAS_TALKING' | 'TERMII';
    apiKey: string;
    senderId: string;
  };
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
  };
}

// ----------------------------------------------------------------------------
// API RESPONSES
// ----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
