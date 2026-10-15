import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

// Superadmin = the developer role. Anyone else is sent away silently — the page
// is never rendered and no "no access" screen reveals that it exists. The
// backend independently returns 403 for every financial endpoint.
export function DeveloperOnlyRoute({ children }: { children: ReactNode }) {
  const role = useAuthStore((s) => s.user?.role);
  if (String(role || '').toLowerCase() !== 'developer') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
