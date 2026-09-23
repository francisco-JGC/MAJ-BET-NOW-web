import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useIsAuthenticated } from '@/features/auth/hooks/use-session';
import { useHasHydrated } from '@/features/auth/store/auth.store';
import { APP_ROUTES } from '@/shared/constants/routes';

/**
 * Blocks route access unless a session is present. Preserves the intended
 * destination via `location.state.from` for a post-login redirect.
 *
 * We wait for zustand to finish reading localStorage (_hasHydrated) before
 * deciding to redirect — without this guard the initial render always sees
 * session=null and bounces logged-in users to the login page.
 */
export function ProtectedRoute() {
  const hasHydrated = useHasHydrated();
  const isAuthed = useIsAuthenticated();
  const location = useLocation();

  if (!hasHydrated) {
    return null;
  }

  if (!isAuthed) {
    return (
      <Navigate to={APP_ROUTES.login} state={{ from: location }} replace />
    );
  }
  return <Outlet />;
}
