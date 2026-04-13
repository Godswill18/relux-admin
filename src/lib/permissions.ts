// ============================================================================
// PERMISSION SYSTEM - ROLE-BASED ACCESS CONTROL
// ============================================================================

import { Permission, Role, User } from '@/types';

// ----------------------------------------------------------------------------
// ROLE TO PERMISSION MAPPING
// ----------------------------------------------------------------------------

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Admin has ALL permissions
    ...Object.values(Permission),
  ],

  [Role.MANAGER]: [
    // Order permissions
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.EDIT_ORDER,
    Permission.ASSIGN_STAFF,
    Permission.UPDATE_ORDER_STATUS,

    // Customer permissions
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.EDIT_CUSTOMER,
    Permission.MANAGE_WALLET,

    // Service permissions
    Permission.VIEW_SERVICES,

    // Payment permissions
    Permission.VIEW_PAYMENTS,
    Permission.CONFIRM_PAYMENT,

    // Staff permissions (limited)
    Permission.VIEW_STAFF,
    Permission.VIEW_SHIFTS,
    Permission.VIEW_ATTENDANCE,

    // Reports
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,

    // Chat
    Permission.VIEW_CHAT,
    Permission.RESPOND_CHAT,
    Permission.ASSIGN_CHAT,
    Permission.CLOSE_CHAT,
  ],

  [Role.RECEPTIONIST]: [
    // Order permissions
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.UPDATE_ORDER_STATUS,

    // Customer permissions
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.EDIT_CUSTOMER,

    // Payment permissions
    Permission.VIEW_PAYMENTS,
    Permission.CONFIRM_PAYMENT,

    // Service permissions
    Permission.VIEW_SERVICES,

    // Chat
    Permission.VIEW_CHAT,
    Permission.RESPOND_CHAT,
  ],

  [Role.STAFF]: [
    // Order permissions (limited - only assigned orders)
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDER_STATUS,

    // Customer permissions (read-only)
    Permission.VIEW_CUSTOMERS,

    // Attendance
    Permission.CLOCK_IN_OUT,
    Permission.VIEW_SHIFTS,

    // Payroll (own only)
    Permission.VIEW_OWN_PAYSLIP,

    // Chat
    Permission.VIEW_CHAT,
    Permission.RESPOND_CHAT,
  ],

  [Role.DELIVERY]: [
    // View and update status of assigned orders only
    Permission.VIEW_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
  ],
};

// ----------------------------------------------------------------------------
// PERMISSION GROUPS (For UI organization)
// ----------------------------------------------------------------------------

export const PERMISSION_GROUPS = {
  'Order Management': [
    Permission.VIEW_ORDERS,
    Permission.CREATE_ORDER,
    Permission.EDIT_ORDER,
    Permission.DELETE_ORDER,
    Permission.ASSIGN_STAFF,
    Permission.UPDATE_ORDER_STATUS,
  ],

  'Customer Management': [
    Permission.VIEW_CUSTOMERS,
    Permission.CREATE_CUSTOMER,
    Permission.EDIT_CUSTOMER,
    Permission.DELETE_CUSTOMER,
    Permission.MANAGE_WALLET,
    Permission.MANAGE_LOYALTY,
  ],

  'Service & Pricing': [
    Permission.VIEW_SERVICES,
    Permission.MANAGE_SERVICES,
    Permission.MANAGE_PRICING,
  ],

  'Payment Management': [
    Permission.VIEW_PAYMENTS,
    Permission.CONFIRM_PAYMENT,
    Permission.PROCESS_REFUND,
    Permission.MANAGE_PAYMENT_SETTINGS,
  ],

  'Staff Management': [
    Permission.VIEW_STAFF,
    Permission.CREATE_STAFF,
    Permission.EDIT_STAFF,
    Permission.DELETE_STAFF,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_PERMISSIONS,
  ],

  'Shift & Attendance': [
    Permission.VIEW_SHIFTS,
    Permission.MANAGE_SHIFTS,
    Permission.VIEW_ATTENDANCE,
    Permission.MANAGE_ATTENDANCE,
    Permission.CLOCK_IN_OUT,
  ],

  'Payroll': [
    Permission.VIEW_PAYROLL,
    Permission.MANAGE_PAYROLL,
    Permission.GENERATE_PAYSLIPS,
    Permission.VIEW_OWN_PAYSLIP,
  ],

  'Communication': [
    Permission.VIEW_CHAT,
    Permission.RESPOND_CHAT,
    Permission.ASSIGN_CHAT,
    Permission.CLOSE_CHAT,
    Permission.SEND_NOTIFICATIONS,
  ],

  'Reports & Analytics': [
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
  ],

  'System Configuration': [
    Permission.MANAGE_SETTINGS,
    Permission.MANAGE_PROMO_CODES,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.MANAGE_LOYALTY_PROGRAM,
    Permission.MANAGE_REFERRAL_PROGRAM,
  ],
};

// ----------------------------------------------------------------------------
// PERMISSION LABELS (Human-readable names)
// ----------------------------------------------------------------------------

export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.VIEW_ORDERS]: 'View Orders',
  [Permission.CREATE_ORDER]: 'Create Orders',
  [Permission.EDIT_ORDER]: 'Edit Orders',
  [Permission.DELETE_ORDER]: 'Delete Orders',
  [Permission.ASSIGN_STAFF]: 'Assign Staff to Orders',
  [Permission.UPDATE_ORDER_STATUS]: 'Update Order Status',

  [Permission.VIEW_CUSTOMERS]: 'View Customers',
  [Permission.CREATE_CUSTOMER]: 'Create Customers',
  [Permission.EDIT_CUSTOMER]: 'Edit Customers',
  [Permission.DELETE_CUSTOMER]: 'Delete Customers',
  [Permission.MANAGE_WALLET]: 'Manage Customer Wallets',
  [Permission.MANAGE_LOYALTY]: 'Manage Customer Loyalty',

  [Permission.VIEW_SERVICES]: 'View Services',
  [Permission.MANAGE_SERVICES]: 'Manage Services',
  [Permission.MANAGE_PRICING]: 'Manage Pricing',

  [Permission.VIEW_PAYMENTS]: 'View Payments',
  [Permission.CONFIRM_PAYMENT]: 'Confirm Payments',
  [Permission.PROCESS_REFUND]: 'Process Refunds',
  [Permission.MANAGE_PAYMENT_SETTINGS]: 'Manage Payment Settings',

  [Permission.VIEW_STAFF]: 'View Staff',
  [Permission.CREATE_STAFF]: 'Create Staff',
  [Permission.EDIT_STAFF]: 'Edit Staff',
  [Permission.DELETE_STAFF]: 'Delete Staff',
  [Permission.MANAGE_ROLES]: 'Manage Roles',
  [Permission.MANAGE_PERMISSIONS]: 'Manage Permissions',

  [Permission.VIEW_SHIFTS]: 'View Shifts',
  [Permission.MANAGE_SHIFTS]: 'Manage Shifts',
  [Permission.VIEW_ATTENDANCE]: 'View Attendance',
  [Permission.MANAGE_ATTENDANCE]: 'Manage Attendance',
  [Permission.CLOCK_IN_OUT]: 'Clock In/Out',

  [Permission.VIEW_PAYROLL]: 'View Payroll',
  [Permission.MANAGE_PAYROLL]: 'Manage Payroll',
  [Permission.GENERATE_PAYSLIPS]: 'Generate Payslips',
  [Permission.VIEW_OWN_PAYSLIP]: 'View Own Payslip',

  [Permission.VIEW_CHAT]: 'View Chat',
  [Permission.RESPOND_CHAT]: 'Respond to Chat',
  [Permission.ASSIGN_CHAT]: 'Assign Chat Threads',
  [Permission.CLOSE_CHAT]: 'Close Chat Threads',

  [Permission.VIEW_REPORTS]: 'View Reports',
  [Permission.EXPORT_REPORTS]: 'Export Reports',
  [Permission.VIEW_AUDIT_LOGS]: 'View Audit Logs',

  [Permission.MANAGE_SETTINGS]: 'Manage System Settings',
  [Permission.MANAGE_PROMO_CODES]: 'Manage Promo Codes',
  [Permission.MANAGE_SUBSCRIPTIONS]: 'Manage Subscriptions',
  [Permission.MANAGE_LOYALTY_PROGRAM]: 'Manage Loyalty Program',
  [Permission.MANAGE_REFERRAL_PROGRAM]: 'Manage Referral Program',
  [Permission.SEND_NOTIFICATIONS]: 'Send Notifications',
};

// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return permissions.every((permission) => user.permissions.includes(permission));
}

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: User | null, role: Role): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if a user is an admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, Role.ADMIN);
}

/**
 * Check if a user is a manager
 */
export function isManager(user: User | null): boolean {
  return hasRole(user, Role.MANAGER);
}

/**
 * Check if a user is staff
 */
export function isStaff(user: User | null): boolean {
  return hasRole(user, Role.STAFF);
}

/**
 * Get permission groups with checked status for a user
 */
export function getPermissionGroupsWithStatus(user: User | null) {
  return Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => ({
    group,
    permissions: permissions.map((permission) => ({
      permission,
      label: PERMISSION_LABELS[permission],
      hasPermission: hasPermission(user, permission),
    })),
  }));
}

/**
 * Determine if a route is accessible based on required permissions
 */
export function canAccessRoute(
  user: User | null,
  requiredPermissions: Permission[],
  requireAll: boolean = false
): boolean {
  if (!user) return false;
  if (requiredPermissions.length === 0) return true;

  if (requireAll) {
    return hasAllPermissions(user, requiredPermissions);
  } else {
    return hasAnyPermission(user, requiredPermissions);
  }
}

// ----------------------------------------------------------------------------
// ROUTE PERMISSION CONFIGURATION
// ----------------------------------------------------------------------------

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Admin routes
  '/admin': [],
  '/admin/dashboard': [Permission.VIEW_ORDERS, Permission.VIEW_CUSTOMERS, Permission.VIEW_REPORTS],
  '/admin/orders': [Permission.VIEW_ORDERS],
  '/admin/customers': [Permission.VIEW_CUSTOMERS],
  '/admin/services': [Permission.VIEW_SERVICES],
  '/admin/payments': [Permission.VIEW_PAYMENTS],
  '/admin/loyalty': [Permission.MANAGE_LOYALTY_PROGRAM],
  '/admin/referrals': [Permission.MANAGE_REFERRAL_PROGRAM],
  '/admin/subscriptions': [Permission.MANAGE_SUBSCRIPTIONS],
  '/admin/promo-codes': [Permission.MANAGE_PROMO_CODES],
  '/admin/staff': [Permission.VIEW_STAFF],
  '/admin/shifts': [Permission.VIEW_SHIFTS],
  '/admin/payroll': [Permission.VIEW_PAYROLL],
  '/admin/chat': [Permission.VIEW_CHAT],
  '/admin/notifications': [Permission.SEND_NOTIFICATIONS],
  '/admin/reports': [Permission.VIEW_REPORTS],
  '/admin/audit': [Permission.VIEW_AUDIT_LOGS],
  '/admin/settings': [Permission.MANAGE_SETTINGS],

  // Staff routes
  '/staff': [],
  '/staff/dashboard': [Permission.VIEW_ORDERS],
  '/staff/orders': [Permission.VIEW_ORDERS],
  '/staff/attendance': [Permission.CLOCK_IN_OUT],
  '/staff/chat': [Permission.VIEW_CHAT],
  '/staff/profile': [Permission.VIEW_OWN_PAYSLIP],
};

/**
 * Get required permissions for a route
 */
export function getRoutePermissions(path: string): Permission[] {
  // Find exact match first
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  // Find closest matching parent route
  const pathSegments = path.split('/').filter(Boolean);
  for (let i = pathSegments.length; i > 0; i--) {
    const parentPath = '/' + pathSegments.slice(0, i).join('/');
    if (ROUTE_PERMISSIONS[parentPath]) {
      return ROUTE_PERMISSIONS[parentPath];
    }
  }

  return [];
}
