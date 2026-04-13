// ============================================================================
// ADMIN LAYOUT - Layout for Admin Role (permission-filtered sidebar)
// ============================================================================

import { ReactNode, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  Award,
  UserPlus,
  Repeat,
  Tag,
  UsersRound,
  Calendar,
  Clock,
  Wallet,
  MessageSquare,
  FileText,
  Shield,
  Settings,
} from 'lucide-react';
import { BaseLayout, NavItem } from './BaseLayout';
import { StaffLayout } from './StaffLayout';
import { ShiftCountdown } from '@/components/shared/ShiftCountdown';
import { useAuthStore } from '@/stores/useAuthStore';
import { Permission } from '@/types';

// ============================================================================
// NAV ITEM DEFINITION WITH OPTIONAL PERMISSION GUARD
// ============================================================================

interface AdminNavItem extends NavItem {
  permission?: Permission;
}

const ALL_ADMIN_NAV: AdminNavItem[] = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: <LayoutDashboard className="h-4 w-4" />,
    // No permission guard — always visible
  },
  {
    label: 'Orders',
    path: '/admin/orders',
    icon: <ShoppingCart className="h-4 w-4" />,
    permission: Permission.VIEW_ORDERS,
  },
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
    icon: <Clock className="h-4 w-4" />,
    permission: Permission.VIEW_ATTENDANCE,
  },
  {
    label: 'Payroll',
    path: '/admin/payroll',
    icon: <Wallet className="h-4 w-4" />,
    permission: Permission.VIEW_PAYROLL,
  },
  {
    label: 'Chat',
    path: '/admin/chat',
    icon: <MessageSquare className="h-4 w-4" />,
    permission: Permission.VIEW_CHAT,
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
// ADMIN LAYOUT COMPONENT
// ============================================================================

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);

  // Staff-role users who've been granted specific admin-area permissions should
  // still see their staff sidebar — not the admin sidebar — so that staff-only
  // nav items (Attendance, Performance, Profile, etc.) never disappear when
  // they navigate to an /admin/* page.
  const normalizedRole = user?.role?.toUpperCase?.();
  if (normalizedRole === 'STAFF') {
    return <StaffLayout>{children}</StaffLayout>;
  }

  // Admin role always gets the full nav (their permissions cannot be restricted).
  // Other roles (manager, receptionist) are filtered by the permissions in JWT.
  const isAdmin = normalizedRole === 'ADMIN';
  const navItems: NavItem[] = useMemo(
    () =>
      isAdmin
        ? ALL_ADMIN_NAV
        : ALL_ADMIN_NAV.filter(
            (item) => !item.permission || permissions.includes(item.permission as Permission)
          ),
    [isAdmin, permissions]
  );

  return (
    <BaseLayout
      navItems={navItems}
      headerTitle={isAdmin ? 'Admin Dashboard' : 'Manager Dashboard'}
      logoText="Relux Laundry"
    >
      {children}
      <ShiftCountdown />
    </BaseLayout>
  );
}
