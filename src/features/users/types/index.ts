export const UserRole = {
  ADMIN: 'admin',
  PARTNER: 'partner',
  SELLER: 'seller',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  address: string | null;
  nationalId: string | null;
  paymentPercentage: number | null;
  salePointId: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  role?: UserRole;
  search?: string;
  limit: number;
  offset: number;
}

export interface ListUsersResponse {
  items: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateUserPayload {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  nationalId?: string;
  paymentPercentage?: number;
  salePointId?: string;
}

/**
 * All fields optional; only set the ones you want to change.
 * Sending `null` explicitly clears a nullable field; `undefined` leaves it
 * untouched. `password` is only re-hashed on the server when non-empty.
 */
export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  password?: string;
  phone?: string | null;
  address?: string | null;
  nationalId?: string | null;
  paymentPercentage?: number | null;
  salePointId?: string | null;
}
