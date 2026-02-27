// ============================================================================
// PROTECTED ROUTE - Route Guard with Permission Checks
// ============================================================================

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Permission, Role } from '@/types';
import { canAccessRoute } from '@/lib/permissions';

// ============================================================================
// TYPES
// ============================================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, ANY permission is enough.
  redirectTo?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get default dashboard route for a user based on their role
 */
function getDefaultDashboard(role: Role | string): string {
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;

  switch (normalizedRole) {
    case Role.ADMIN:
    case Role.MANAGER:
    case Role.RECEPTIONIST:
    case 'ADMIN':
    case 'MANAGER':
    case 'RECEPTIONIST':
      return '/admin';
    case Role.STAFF:
    case 'STAFF':
      return '/staff';
    default:
      return '/unauthorized';
  }
}

/**
 * Check if user role is allowed in the system
 */
function isRoleAllowed(role: Role | string): boolean {
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;

  // Block customer role
  if (normalizedRole === 'CUSTOMER') {
    return false;
  }

  // Allow admin, manager, receptionist, and staff roles
  return [
    Role.ADMIN,
    Role.MANAGER,
    Role.RECEPTIONIST,
    Role.STAFF,
    'ADMIN',
    'MANAGER',
    'RECEPTIONIST',
    'STAFF'
  ].includes(normalizedRole as any);
}

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

/**
 * ProtectedRoute wraps routes that require authentication and/or specific permissions
 *
 * @example
 * ```tsx
 * <ProtectedRoute requiredPermissions={[Permission.VIEW_ORDERS]}>
 *   <OrdersPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredPermissions = [],
  requireAll = false,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Block customer role
  if (!isRoleAllowed(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  const currentPath = location.pathname;

  // Normalize role for comparison (handle both enum and string values, case-insensitive)
  const normalizedRole = typeof user.role === 'string' ? user.role.toUpperCase() : user.role;

  // Guard the role-specific DASHBOARDS only (not every page under each prefix).
  // This keeps each role on their home dashboard while allowing permission-granted
  // cross-role page access (e.g. a staff user granted VIEW_REPORTS can reach /admin/reports).

  // Staff should not land on the admin dashboard — redirect them to their portal
  if (currentPath === '/admin' && (normalizedRole === 'STAFF' || normalizedRole === Role.STAFF)) {
    return <Navigate to="/staff" replace />;
  }

  // Non-staff roles should not land on the staff dashboard — redirect to admin area
  if (currentPath === '/staff' &&
      (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'RECEPTIONIST' ||
       normalizedRole === Role.ADMIN || normalizedRole === Role.MANAGER || normalizedRole === Role.RECEPTIONIST)) {
    return <Navigate to="/admin" replace />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    // Admin role has implicit access to all routes (permissions cannot be restricted)
    const isAdminRole =
      normalizedRole === 'ADMIN' || normalizedRole === Role.ADMIN;

    if (isAdminRole) {
      return <>{children}</>;
    }

    // All other roles (manager, receptionist, staff) must pass the permission check.
    // Their permissions come from the DB via the JWT and are stored in user.permissions.
    const hasAccess = canAccessRoute(user, requiredPermissions, requireAll);

    if (!hasAccess) {
      // Redirect to unauthorized — NOT the user's dashboard, which could be the
      // same route that just failed (infinite redirect loop).
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}

// ============================================================================
// UNAUTHORIZED PAGE (Simple fallback)
// ============================================================================

/**
 * Simple unauthorized page component
 * This can be replaced with a more styled component later
 */
export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <h2 className="mt-2 text-2xl font-semibold">Unauthorized</h2>
        <p className="mt-2 text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
