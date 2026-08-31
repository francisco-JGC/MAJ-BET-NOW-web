import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useIsAuthenticated } from '@/features/auth/hooks/use-session';
import { APP_ROUTES } from '@/shared/constants/routes';

/**
 * Blocks route access unless a session is present. Preserves the intended
 * destination via `location.state.from` for a post-login redirect.
 */
export function ProtectedRoute() {
  const isAuthed = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthed) {
    return (
      <Navigate to={APP_ROUTES.login} state={{ from: location }} replace />
    );
  }
  return <Outlet />;
}
