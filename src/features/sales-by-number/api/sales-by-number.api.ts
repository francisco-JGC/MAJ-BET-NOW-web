import { http } from '@/shared/api/http';

import type {
  SalesByNumberParams,
  SalesByNumberResponse,
} from '@/features/sales-by-number/types';

export async function getSalesByNumber(
  params: SalesByNumberParams,
): Promise<SalesByNumberResponse> {
  const { data } = await http.get<SalesByNumberResponse>(
    '/tickets/sales-by-number',
    {
      params: {
        salePointId: params.salePointId || undefined,
        gameId: params.gameId || undefined,
        sellerId: params.sellerId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}
