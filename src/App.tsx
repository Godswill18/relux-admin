// ============================================================================
// APP - Main Application Router
// ============================================================================

import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute, UnauthorizedPage } from '@/components/shared/ProtectedRoute';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StaffLayout } from '@/components/layouts/StaffLayout';
import { PlaceholderPage } from '@/components/shared/PlaceholderPage';
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import { DeveloperOnlyRoute } from '@/components/shared/DeveloperOnlyRoute';
import { DeliveryLayout } from '@/components/layouts/DeliveryLayout';
import { Permission, Role } from '@/types';
import { useAuthStore } from '@/stores/useAuthStore';
import { lazyPage, RouteSuspense } from '@/components/shared/LazyRoute';

// Each page is its own download, so signing in doesn't fetch the code for every
// screen in the app. Login stays in the main bundle: it's the first thing shown.
const AdminDashboard = lazyPage(() => import('@/features/admin/dashboard/AdminDashboard'));
const OrdersPage = lazyPage(() => import('@/features/admin/orders/OrdersPage'));
const OrderDetailPage = lazyPage(() => import('@/features/admin/orders/OrderDetailPage'));
const DeliveryConfirmPage = lazyPage(() => import('@/features/admin/orders/DeliveryConfirmPage'));
const DeliveredOrdersPage = lazyPage(() => import('@/features/admin/orders/DeliveredOrdersPage'));
const CustomersPage = lazyPage(() => import('@/features/admin/customers/CustomersPage'));
const ServicesPage = lazyPage(() => import('@/features/admin/services/ServicesPage'));
const PaymentsPage = lazyPage(() => import('@/features/admin/payments/PaymentsPage'));
const LoyaltyPage = lazyPage(() => import('@/features/admin/loyalty/LoyaltyPage'));
const LeaderboardPage = lazyPage(() => import('@/features/admin/leaderboard/LeaderboardPage'));
const ReferralsPage = lazyPage(() => import('@/features/admin/referrals/ReferralsPage'));
const SubscriptionsPage = lazyPage(() => import('@/features/admin/subscriptions/SubscriptionsPage'));
const PromoCodesPage = lazyPage(() => import('@/features/admin/promo-codes/PromoCodesPage'));
const StaffPage = lazyPage(() => import('@/features/admin/staff/StaffPage'));
const ShiftsPage = lazyPage(() => import('@/features/admin/shifts/ShiftsPage'));
const PayrollPage = lazyPage(() => import('@/features/admin/payroll/PayrollPage'));
const ChatPage = lazyPage(() => import('@/features/admin/chat/ChatPage'));
const ReportsPage = lazyPage(() => import('@/features/admin/reports/ReportsPage'));
const FinancialReportsPage = lazyPage(() => import('@/features/admin/reports/FinancialReportsPage'));
const AuditPage = lazyPage(() => import('@/features/admin/audit/AuditPage'));
const SettingsPage = lazyPage(() => import('@/features/admin/settings/SettingsPage'));
const AnnouncementsPage = lazyPage(() => import('@/features/admin/announcements/AnnouncementsPage'));
const AdminAttendancePage = lazyPage(() => import('@/features/admin/attendance/AdminAttendancePage'));
const StaffDashboard = lazyPage(() => import('@/features/staff/dashboard/StaffDashboard'));
const StaffOrdersPage = lazyPage(() => import('@/features/staff/orders/StaffOrdersPage'));
const StaffDeliveredOrdersPage = lazyPage(() => import('@/features/staff/orders/StaffDeliveredOrdersPage'));
const StaffAttendancePage = lazyPage(() => import('@/features/staff/attendance/StaffAttendancePage'));
const StaffChatPage = lazyPage(() => import('@/features/staff/chat/StaffChatPage'));
const StaffProfilePage = lazyPage(() => import('@/features/staff/profile/StaffProfilePage'));
const StaffPerformancePage = lazyPage(() => import('@/features/staff/performance/StaffPerformancePage'));
const DeliveryDashboard = lazyPage(() => import('@/features/delivery/dashboard/DeliveryDashboard'));
const DeliveryOrdersPage = lazyPage(() => import('@/features/delivery/orders/DeliveryOrdersPage'));
const ScanPickupPage = lazyPage(() => import('@/features/delivery/orders/ScanPickupPage'));

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

  if (roleString === 'DEVELOPER' || roleString === Role.DEVELOPER) {
    return <Navigate to="/admin" replace />;
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
        <ScrollToTop />
        <Routes>
          {/* ===================================================================
              ROOT REDIRECT
          =================================================================== */}
          <Route path="/" element={<RootRedirect />} />

          {/* ===================================================================
              PUBLIC ROUTES
          =================================================================== */}
          <Route path="/login" element={<Login />} />
          {/* <Route path="/signup" element={<Signup />} /> */}
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
                  <RouteSuspense><Outlet /></RouteSuspense>
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
            <Route path="leaderboard" element={<LeaderboardPage />} />
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
              path="financial-reports"
              element={
                <DeveloperOnlyRoute>
                  <FinancialReportsPage />
                </DeveloperOnlyRoute>
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
            <Route
              path="announcements"
              element={
                <ProtectedRoute requiredPermissions={[Permission.SEND_NOTIFICATIONS]}>
                  <AnnouncementsPage />
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
                  <RouteSuspense><Outlet /></RouteSuspense>
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
                  <RouteSuspense><Outlet /></RouteSuspense>
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
