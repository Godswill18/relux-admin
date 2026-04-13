// ============================================================================
// DELIVERY LAYOUT - Layout for Delivery Role
// ============================================================================

import { ReactNode } from 'react';
import { LayoutDashboard, PackageSearch, User } from 'lucide-react';
import { BaseLayout } from './BaseLayout';
import { ShiftCountdown } from '@/components/shared/ShiftCountdown';

const DELIVERY_NAV = [
  {
    label: 'Dashboard',
    path: '/delivery',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'My Orders',
    path: '/delivery/orders',
    icon: <PackageSearch className="h-4 w-4" />,
  },
  {
    label: 'Profile',
    path: '/delivery/profile',
    icon: <User className="h-4 w-4" />,
  },
];

interface DeliveryLayoutProps {
  children: ReactNode;
}

export function DeliveryLayout({ children }: DeliveryLayoutProps) {
  return (
    <BaseLayout
      navItems={DELIVERY_NAV}
      headerTitle="Delivery Portal"
      logoText="Relux Laundry"
    >
      {children}
      <ShiftCountdown />
    </BaseLayout>
  );
}
