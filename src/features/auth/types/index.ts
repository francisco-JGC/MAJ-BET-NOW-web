export { UserRole } from '@/features/users/types';
import type { UserRole } from '@/features/users/types';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  /** Short-lived JWT used in every API call as `Authorization: Bearer`. */
  token: string;
  /** Long-lived JWT used only against `POST /auth/refresh`. */
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface LoginPayload {
  username: string;
  password: string;
}
