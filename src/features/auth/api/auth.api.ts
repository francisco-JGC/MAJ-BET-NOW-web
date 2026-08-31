import { http } from '@/shared/api/http';

import type {
  AuthSession,
  AuthenticatedUser,
  LoginPayload,
} from '@/features/auth/types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

interface RefreshResponse {
  accessToken: string;
}

/** POST /auth/login — thin wrapper around the backend endpoint. */
export async function login(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await http.post<LoginResponse>('/auth/login', payload);
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

/**
 * POST /auth/refresh — exchange a valid refresh token for a fresh access
 * token. Called by the axios interceptor when a 401 lands on an
 * authenticated request. Uses the raw axios import (not our `http`
 * instance) to avoid the interceptor recursively calling itself when
 * refresh itself fails.
 */
export async function refresh(refreshToken: string): Promise<string> {
  const { data } = await http.post<RefreshResponse>(
    '/auth/refresh',
    { refreshToken },
    // Tag the request so the response interceptor knows this call itself
    // is the refresh attempt and must NOT try to refresh again on 401.
    { headers: { 'X-Refresh-Attempt': '1' } },
  );
  return data.accessToken;
}
