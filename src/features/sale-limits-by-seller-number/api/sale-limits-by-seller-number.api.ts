import { http } from '@/shared/api/http';

import type {
  SaleLimitBySellerNumber,
  UpsertSaleLimitBySellerNumberPayload,
} from '@/features/sale-limits-by-seller-number/types';

export async function listSaleLimitsBySellerNumber(
  salePointId: string,
): Promise<SaleLimitBySellerNumber[]> {
  const { data } = await http.get<SaleLimitBySellerNumber[]>(
    '/sale-limits-by-seller-number',
    { params: { salePointId } },
  );
  return data;
}

export async function upsertSaleLimitBySellerNumber(
  payload: UpsertSaleLimitBySellerNumberPayload,
): Promise<SaleLimitBySellerNumber> {
  const { data } = await http.put<SaleLimitBySellerNumber>(
    '/sale-limits-by-seller-number',
    payload,
  );
  return data;
}

export async function deleteSaleLimitBySellerNumber(
  id: string,
): Promise<void> {
  await http.delete(`/sale-limits-by-seller-number/${id}`);
}
