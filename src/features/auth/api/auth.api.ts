import { AUTH_ENDPOINTS } from '@/features/auth/constants';
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

/** POST /auth/login — wrapper fino sobre el endpoint del backend. */
export async function login(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await http.post<LoginResponse>(AUTH_ENDPOINTS.login, payload);
  return {
    token: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

// El refresh NO vive acá: lo maneja `features/auth/session.ts` con su
// propio cliente sin interceptores. Tener dos caminos de refresh fue
// justamente lo que hacía que una caída de red borrara la sesión.
