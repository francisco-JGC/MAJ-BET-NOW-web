import { http } from '@/shared/api/http';

import type {
  CreateUserPayload,
  ListUsersParams,
  ListUsersResponse,
  UpdateUserPayload,
  User,
} from '@/features/users/types';

export async function listUsers(
  params: ListUsersParams,
): Promise<ListUsersResponse> {
  const { data } = await http.get<ListUsersResponse>('/users', {
    params: {
      role: params.role,
      search: params.search || undefined,
      salePointId: params.salePointId || undefined,
      limit: params.limit,
      offset: params.offset,
    },
  });
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await http.post<User>('/users', payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<User> {
  const { data } = await http.patch<User>(`/users/${id}`, payload);
  return data;
}

export interface TransferPreview {
  ticketCount: number;
  movementCount: number;
}

export interface TransferResult {
  user: User;
  ticketsMoved: number;
  movementsMoved: number;
}

export async function fetchTransferPreview(
  userId: string,
  newSalePointId: string,
): Promise<TransferPreview> {
  const { data } = await http.get<TransferPreview>(
    `/users/${userId}/transfer-branch/preview`,
    { params: { newSalePointId } },
  );
  return data;
}

export async function transferSellerBranch(
  userId: string,
  newSalePointId: string,
): Promise<TransferResult> {
  const { data } = await http.post<TransferResult>(
    `/users/${userId}/transfer-branch`,
    { newSalePointId },
  );
  return data;
}

export async function fetchSyncPreview(userId: string): Promise<TransferPreview> {
  const { data } = await http.get<TransferPreview>(
    `/users/${userId}/sync-branch/preview`,
  );
  return data;
}

export async function syncSellerBranch(userId: string): Promise<TransferResult> {
  const { data } = await http.post<TransferResult>(
    `/users/${userId}/sync-branch`,
  );
  return data;
}

/**
 * Configura el "Modo vendedor" del admin logueado. El backend valida
 * que quien llama sea admin y que — si activa el modo — la sucursal
 * elegida exista y esté activa.
 */
export async function updateMyMobileSalesProfile(payload: {
  mobileSalesEnabled: boolean;
  defaultSalePointId: string | null;
}): Promise<User> {
  const { data } = await http.patch<User>(
    '/users/me/mobile-sales',
    payload,
  );
  return data;
}
