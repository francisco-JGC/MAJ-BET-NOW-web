import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { queryClient } from '@/app/providers/query-provider';

import type { AuthSession } from '@/features/auth/types';

interface AuthState {
  session: AuthSession | null;
  /**
   * True once zustand has finished reading the persisted session from
   * localStorage. Stays false during the brief window between the initial
   * render (where session is null) and the async hydration. ProtectedRoute
   * waits for this flag before deciding whether to redirect to login,
   * preventing false logouts when a valid session sits in localStorage.
   */
  _hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  /**
   * Replace only the short-lived access token — used after a successful
   * silent refresh so the same session object keeps working.
   */
  setAccessToken: (token: string) => void;
  clearSession: () => void;
  _setHasHydrated: (v: boolean) => void;
}

/**
 * Auth state store. This is the ONLY place where the JWT and session user live.
 *
 * We use zustand with `persist` because the JWT must survive full page reloads
 * (unlike React Query state, which is in-memory). Do not put server data
 * (games, tickets, etc.) here — that belongs in React Query.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      _hasHydrated: false,
      setSession: (session) => set({ session }),
      setAccessToken: (token) =>
        set((state) =>
          state.session ? { session: { ...state.session, token } } : state,
        ),
      clearSession: () => set({ session: null }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'majbetnow.auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the session — _hasHydrated is ephemeral UI state.
      partialize: (state) => ({ session: state.session }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

/** True once the persisted session has been loaded from localStorage. */
export function useHasHydrated(): boolean {
  return useAuthStore((s) => s._hasHydrated);
}

/** Bare token accessor for non-React code (interceptors). */
export function getAuthToken(): string | null {
  return useAuthStore.getState().session?.token ?? null;
}

/** Refresh-token accessor for the interceptor's silent-refresh path. */
export function getRefreshToken(): string | null {
  return useAuthStore.getState().session?.refreshToken ?? null;
}

/** Called by the interceptor after a successful refresh. */
export function updateAccessToken(token: string): void {
  useAuthStore.getState().setAccessToken(token);
}

/**
 * Force a logout — used by 401 interceptor to clear the invalid session.
 * Also wipes the TanStack Query cache so the next user (or the next login)
 * doesn't see the previous session's data during the stale window.
 */
export function forceLogout(): void {
  useAuthStore.getState().clearSession();
  queryClient.clear();
}
