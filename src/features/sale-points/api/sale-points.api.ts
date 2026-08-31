import { http } from '@/shared/api/http';

import type {
  CreateSalePointPayload,
  SalePoint,
  SetAssignedPartnersPayload,
  UpdateSalePointPayload,
} from '@/features/sale-points/types';

export async function listSalePoints(options?: {
  includeInactive?: boolean;
}): Promise<SalePoint[]> {
  const { data } = await http.get<SalePoint[]>('/sale-points', {
    params: options?.includeInactive ? { includeInactive: 'true' } : {},
  });
  return data;
}

export async function createSalePoint(
  payload: CreateSalePointPayload,
): Promise<SalePoint> {
  const { data } = await http.post<SalePoint>('/sale-points', payload);
  return data;
}

export async function toggleSalePoint(
  id: string,
  active: boolean,
): Promise<SalePoint> {
  const { data } = await http.patch<SalePoint>(`/sale-points/${id}/toggle`, {
    active,
  });
  return data;
}

export async function updateSalePoint(
  id: string,
  payload: UpdateSalePointPayload,
): Promise<SalePoint> {
  const { data } = await http.patch<SalePoint>(`/sale-points/${id}`, payload);
  return data;
}

export async function setAssignedPartners(
  id: string,
  payload: SetAssignedPartnersPayload,
): Promise<SalePoint> {
  const { data } = await http.put<SalePoint>(
    `/sale-points/${id}/assigned-partners`,
    payload,
  );
  return data;
}
