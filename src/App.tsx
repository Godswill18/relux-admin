// ============================================================================
// APP - Main Application Router
// ============================================================================

import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute, UnauthorizedPage } from '@/components/shared/ProtectedRoute';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StaffLayout } from '@/components/layouts/StaffLayout';
import { PlaceholderPage } from '@/components/shared/PlaceholderPage';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import AdminDashboard from '@/features/admin/dashboard/AdminDashboard';
import OrdersPage from '@/features/admin/orders/OrdersPage';
import OrderDetailPage from '@/features/admin/orders/OrderDetailPage';
import DeliveryConfirmPage from '@/features/admin/orders/DeliveryConfirmPage';
import DeliveredOrdersPage from '@/features/admin/orders/DeliveredOrdersPage';
import CustomersPage from '@/features/admin/customers/CustomersPage';
import ServicesPage from '@/features/admin/services/ServicesPage';
import PaymentsPage from '@/features/admin/payments/PaymentsPage';
import LoyaltyPage from '@/features/admin/loyalty/LoyaltyPage';
import ReferralsPage from '@/features/admin/referrals/ReferralsPage';
import SubscriptionsPage from '@/features/admin/subscriptions/SubscriptionsPage';
import PromoCodesPage from '@/features/admin/promo-codes/PromoCodesPage';
import StaffPage from '@/features/admin/staff/StaffPage';
import ShiftsPage from '@/features/admin/shifts/ShiftsPage';
import PayrollPage from '@/features/admin/payroll/PayrollPage';
import ChatPage from '@/features/admin/chat/ChatPage';
import ReportsPage from '@/features/admin/reports/ReportsPage';
import AuditPage from '@/features/admin/audit/AuditPage';
import SettingsPage from '@/features/admin/settings/SettingsPage';
import AdminAttendancePage from '@/features/admin/attendance/AdminAttendancePage';
import StaffDashboard from '@/features/staff/dashboard/StaffDashboard';
import StaffOrdersPage from '@/features/staff/orders/StaffOrdersPage';
import StaffDeliveredOrdersPage from '@/features/staff/orders/StaffDeliveredOrdersPage';
import StaffAttendancePage from '@/features/staff/attendance/StaffAttendancePage';
import StaffChatPage from '@/features/staff/chat/StaffChatPage';
import StaffProfilePage from '@/features/staff/profile/StaffProfilePage';
import StaffPerformancePage from '@/features/staff/performance/StaffPerformancePage';
import { DeliveryLayout } from '@/components/layouts/DeliveryLayout';
import DeliveryDashboard from '@/features/delivery/dashboard/DeliveryDashboard';
import DeliveryOrdersPage from '@/features/delivery/orders/DeliveryOrdersPage';
import ScanPickupPage from '@/features/delivery/orders/ScanPickupPage';
import { Permission, Role } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';

// ============================================================================
// ROOT REDIRECT COMPONENT
// ============================================================================

function RootRedirect() {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role (handle both enum and string values)
  const roleString = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;

  if (roleString === 'STAFF' || roleString === Role.STAFF) {
    return <Navigate to="/staff" replace />;
  }

  if (roleString === 'DELIVERY' || roleString === Role.DELIVERY) {
    return <Navigate to="/delivery" replace />;
  }

  // Default to admin for ADMIN, MANAGER, RECEPTIONIST
  return <Navigate to="/admin" replace />;
}

// ============================================================================
// QUERY CLIENT
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================================
// APP COMPONENT
// ============================================================================

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ===================================================================
              ROOT REDIRECT
          =================================================================== */}
          <Route path="/" element={<RootRedirect />} />

          {/* ===================================================================
              PUBLIC ROUTES
          =================================================================== */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ===================================================================
              ADMIN ROUTES — Layout mounts ONCE; only page content swaps via
              <Outlet>. This prevents the sidebar from re-computing on every
              navigation, which was causing items to disappear.
          =================================================================== */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Outlet />
                </AdminLayout>
              </ProtectedRoute>
            }
          >
            {/* Dashboard — index route, no permission gate */}
            <Route index element={<AdminDashboard />} />

            {/* Each child route carries its own permission check */}
            <Route
              path="orders"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/delivery-confirm"
              element={
                <ProtectedRoute requiredPermissions={[Permission.UPDATE_ORDER_STATUS]}>
                  <DeliveryConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/delivered"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <DeliveredOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/:id"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="customers"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_CUSTOMERS]}>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="services"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_SERVICES]}>
                  <ServicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payments"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_PAYMENTS]}>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="loyalty"
              element={
                <ProtectedRoute requiredPermissions={[Permission.MANAGE_LOYALTY_PROGRAM]}>
                  <LoyaltyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="referrals"
              element={
                <ProtectedRoute requiredPermissions={[Permission.MANAGE_REFERRAL_PROGRAM]}>
                  <ReferralsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subscriptions"
              element={
                <ProtectedRoute requiredPermissions={[Permission.MANAGE_SUBSCRIPTIONS]}>
                  <SubscriptionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="promo-codes"
              element={
                <ProtectedRoute requiredPermissions={[Permission.MANAGE_PROMO_CODES]}>
                  <PromoCodesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="staff"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_STAFF]}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="shifts"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_SHIFTS]}>
                  <ShiftsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_PAYROLL]}>
                  <PayrollPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_CHAT]}>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_REPORTS]}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_AUDIT_LOGS]}>
                  <AuditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ATTENDANCE]}>
                  <AdminAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute requiredPermissions={[Permission.MANAGE_SETTINGS]}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<StaffProfilePage />} />
          </Route>

          {/* ===================================================================
              STAFF ROUTES — Same pattern: layout mounts once, Outlet swaps pages
          =================================================================== */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <StaffLayout>
                  <Outlet />
                </StaffLayout>
              </ProtectedRoute>
            }
          >
            {/* Dashboard — index route */}
            <Route index element={<StaffDashboard />} />

            <Route
              path="orders"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <StaffOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/delivery-confirm"
              element={
                <ProtectedRoute requiredPermissions={[Permission.UPDATE_ORDER_STATUS]}>
                  <DeliveryConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/delivered"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <StaffDeliveredOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <ProtectedRoute requiredPermissions={[Permission.CLOCK_IN_OUT]}>
                  <StaffAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="chat"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_CHAT]}>
                  <StaffChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <StaffPerformancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={<StaffProfilePage />}
            />
          </Route>

          {/* ===================================================================
              DELIVERY ROUTES — Layout mounts ONCE; page content swaps via Outlet
          =================================================================== */}
          <Route
            path="/delivery"
            element={
              <ProtectedRoute>
                <DeliveryLayout>
                  <Outlet />
                </DeliveryLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<DeliveryDashboard />} />
            <Route
              path="orders"
              element={
                <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
                  <DeliveryOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/delivery-confirm"
              element={
                <ProtectedRoute requiredPermissions={[Permission.UPDATE_ORDER_STATUS]}>
                  <DeliveryConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders/scan-pickup"
              element={
                <ProtectedRoute requiredPermissions={[Permission.UPDATE_ORDER_STATUS]}>
                  <ScanPickupPage />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<StaffProfilePage />} />
          </Route>

          {/* ===================================================================
              404
          =================================================================== */}
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="404 - Page Not Found"
                description="The page you're looking for doesn't exist"
              />
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
