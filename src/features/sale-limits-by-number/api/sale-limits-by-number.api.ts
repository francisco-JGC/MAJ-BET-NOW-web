import { http } from '@/shared/api/http';

import type {
  SaleLimitByNumber,
  UpsertSaleLimitByNumberPayload,
} from '@/features/sale-limits-by-number/types';

export async function listSaleLimitsByNumber(
  salePointId: string,
): Promise<SaleLimitByNumber[]> {
  const { data } = await http.get<SaleLimitByNumber[]>(
    '/sale-limits-by-number',
    { params: { salePointId } },
  );
  return data;
}

export async function upsertSaleLimitByNumber(
  payload: UpsertSaleLimitByNumberPayload,
): Promise<SaleLimitByNumber> {
  const { data } = await http.put<SaleLimitByNumber>(
    '/sale-limits-by-number',
    payload,
  );
  return data;
}

export async function deleteSaleLimitByNumber(id: string): Promise<void> {
  await http.delete(`/sale-limits-by-number/${id}`);
}
