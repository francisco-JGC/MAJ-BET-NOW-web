import { http } from '@/shared/api/http';

import type {
  SaleLimit,
  UpsertSaleLimitPayload,
} from '@/features/sale-limits/types';

export async function listSaleLimits(): Promise<SaleLimit[]> {
  const { data } = await http.get<SaleLimit[]>('/sale-limits');
  return data;
}

export async function upsertSaleLimit(
  payload: UpsertSaleLimitPayload,
): Promise<SaleLimit> {
  const { data } = await http.put<SaleLimit>('/sale-limits', payload);
  return data;
}

export async function deleteSaleLimit(id: string): Promise<void> {
  await http.delete(`/sale-limits/${id}`);
}
