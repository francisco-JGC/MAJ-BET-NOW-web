import { useMutation } from '@tanstack/react-query';

import { login } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { toApiError } from '@/shared/api/error-mapper';

import { UserRole } from '@/features/auth/types';

import type { AuthSession, LoginPayload } from '@/features/auth/types';
import type { ApiError } from '@/shared/types/api';

const WEB_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.PARTNER]);

/**
 * Login mutation. On success it hydrates the auth store.
 *
 * The web panel is for admins and partners (socios). Sellers use the mobile
 * app — letting them in would land them in an empty shell, so we reject
 * their session up front with a friendly {@link ApiError}.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation<AuthSession, ApiError, LoginPayload>({
    mutationFn: async (payload) => {
      let session: AuthSession;
      try {
        session = await login(payload);
      } catch (error) {
        throw toApiError(error);
      }
      if (!WEB_ROLES.has(session.user.role)) {
        throw {
          status: 403,
          code: 'Forbidden',
          message:
            'Este panel es solo para administradores y socios. ' +
            'Usa la aplicación móvil para tu cuenta de vendedor.',
        } satisfies ApiError;
      }
      return session;
    },
    onSuccess: (session) => setSession(session),
  });
}
