// ============================================================================
// STAFF LAYOUT - Layout for Staff Role (permission-filtered sidebar)
// ============================================================================

import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  MessageSquare,
  User,
  BarChart2,
  Users,
  Package,
  CreditCard,
  Award,
  UserPlus,
  Repeat,
  Tag,
  UsersRound,
  Calendar,
  Wallet,
  Bell,
  FileText,
  Shield,
  Settings,
  ClockIcon,
} from 'lucide-react';
import { BaseLayout, NavItem } from './BaseLayout';
import { ShiftCountdown } from '@/components/shared/ShiftCountdown';
import { useAuthStore } from '@/stores/useAuthStore';
import { Permission } from '@/types';

// ============================================================================
// NAV ITEM DEFINITION WITH OPTIONAL PERMISSION GUARD
// ============================================================================

interface StaffNavItem extends NavItem {
  permission?: Permission;
}

// Pages that belong to the staff portal (staff-specific routes & content)
const STAFF_NAV: StaffNavItem[] = [
  {
    label: 'Dashboard',
    path: '/staff',
    icon: <LayoutDashboard className="h-4 w-4" />,
    // No permission guard — always visible
  },
  {
    label: 'My Orders',
    path: '/staff/orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    permission: Permission.VIEW_ORDERS,
  },
  {
    label: 'Attendance',
    path: '/staff/attendance',
    icon: <Clock className="h-4 w-4" />,
    permission: Permission.CLOCK_IN_OUT,
  },
  {
    label: 'Performance',
    path: '/staff/performance',
    icon: <BarChart2 className="h-4 w-4" />,
    permission: Permission.VIEW_ORDERS,
  },
  {
    label: 'Chat',
    path: '/staff/chat',
    icon: <MessageSquare className="h-4 w-4" />,
    permission: Permission.VIEW_CHAT,
  },
  {
    label: 'Profile',
    path: '/staff/profile',
    icon: <User className="h-4 w-4" />,
    permission: Permission.VIEW_OWN_PAYSLIP,
  },
];

// Admin-only pages — these have no staff-specific equivalent.
// If a staff user is explicitly granted one of these permissions, the page
// appears in their sidebar pointing to the admin-area route.
const ADMIN_ONLY_NAV: StaffNavItem[] = [
  {
    label: 'Customers',
    path: '/admin/customers',
    icon: <Users className="h-4 w-4" />,
    permission: Permission.VIEW_CUSTOMERS,
  },
  {
    label: 'Services',
    path: '/admin/services',
    icon: <Package className="h-4 w-4" />,
    permission: Permission.VIEW_SERVICES,
  },
  {
    label: 'Payments',
    path: '/admin/payments',
    icon: <CreditCard className="h-4 w-4" />,
    permission: Permission.VIEW_PAYMENTS,
  },
  {
    label: 'Loyalty',
    path: '/admin/loyalty',
    icon: <Award className="h-4 w-4" />,
    permission: Permission.MANAGE_LOYALTY_PROGRAM,
  },
  {
    label: 'Referrals',
    path: '/admin/referrals',
    icon: <UserPlus className="h-4 w-4" />,
    permission: Permission.MANAGE_REFERRAL_PROGRAM,
  },
  {
    label: 'Subscriptions',
    path: '/admin/subscriptions',
    icon: <Repeat className="h-4 w-4" />,
    permission: Permission.MANAGE_SUBSCRIPTIONS,
  },
  {
    label: 'Promo Codes',
    path: '/admin/promo-codes',
    icon: <Tag className="h-4 w-4" />,
    permission: Permission.MANAGE_PROMO_CODES,
  },
  {
    label: 'Staff',
    path: '/admin/staff',
    icon: <UsersRound className="h-4 w-4" />,
    permission: Permission.VIEW_STAFF,
  },
  {
    label: 'Shifts',
    path: '/admin/shifts',
    icon: <Calendar className="h-4 w-4" />,
    permission: Permission.VIEW_SHIFTS,
  },
  {
    label: 'Attendance',
    path: '/admin/attendance',
    icon: <ClockIcon className="h-4 w-4" />,
    permission: Permission.VIEW_ATTENDANCE,
  },
  {
    label: 'Payroll',
    path: '/admin/payroll',
    icon: <Wallet className="h-4 w-4" />,
    permission: Permission.VIEW_PAYROLL,
  },
  {
    label: 'Notifications',
    path: '/admin/notifications',
    icon: <Bell className="h-4 w-4" />,
    permission: Permission.SEND_NOTIFICATIONS,
  },
  {
    label: 'Reports',
    path: '/admin/reports',
    icon: <FileText className="h-4 w-4" />,
    permission: Permission.VIEW_REPORTS,
  },
  {
    label: 'Audit Logs',
    path: '/admin/audit',
    icon: <Shield className="h-4 w-4" />,
    permission: Permission.VIEW_AUDIT_LOGS,
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    icon: <Settings className="h-4 w-4" />,
    permission: Permission.MANAGE_SETTINGS,
  },
];

// ============================================================================
// STAFF LAYOUT COMPONENT
// ============================================================================

interface StaffLayoutProps {
  children: ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const permissions = useAuthStore((state) => state.permissions);
  const { pathname } = useLocation();

  const navItems: NavItem[] = useMemo(
    () => [
      // Staff-native pages — show if user has the required permission (or no permission needed)
      // Mark Profile as hidden (not removed) when already on the profile page so sibling items don't shift
      ...STAFF_NAV.filter(
        (item) => !item.permission || permissions.includes(item.permission as Permission)
      ).map((item) => ({
        ...item,
        hidden: item.path === '/staff/profile' && pathname === '/staff/profile',
      })),
      // Admin-only pages — show ONLY if user has been explicitly granted the permission
      ...ADMIN_ONLY_NAV.filter((item) =>
        item.permission && permissions.includes(item.permission as Permission)
      ),
    ],
    [permissions, pathname]
  );

  return (
    <BaseLayout
      navItems={navItems}
      headerTitle="Staff Portal"
      logoText="Relux Laundry"
    >
      {children}
      <ShiftCountdown />
    </BaseLayout>
  );
}
