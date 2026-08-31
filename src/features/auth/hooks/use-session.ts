import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store/auth.store';

/** Convenience read of the current session (or null). */
export function useSession() {
  return useAuthStore((s) => s.session);
}

/** True if there's an active session. */
export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.session !== null);
}

/**
 * Logout action. Clears the auth store AND wipes the TanStack Query cache
 * so that a new user logging in on the same browser tab can't briefly see
 * the previous user's cached data before the stale windows expire.
 */
export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();
  return useCallback(() => {
    clearSession();
    qc.clear();
  }, [clearSession, qc]);
}
