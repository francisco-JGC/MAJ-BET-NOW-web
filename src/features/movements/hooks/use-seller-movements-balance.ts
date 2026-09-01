import { useQuery } from '@tanstack/react-query';

import { getSellerMovementsBalance } from '@/features/movements/api/movements.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SellerMovementsBalanceParams,
  SellerMovementsBalanceResponse,
} from '@/features/movements/types';
import type { ApiError } from '@/shared/types/api';

export const sellerMovementsBalanceQueryKeys = {
  all: ['seller-movements-balance'] as const,
  list: (params: SellerMovementsBalanceParams) =>
    [...sellerMovementsBalanceQueryKeys.all, 'list', params] as const,
};

export function useSellerMovementsBalance(params: SellerMovementsBalanceParams) {
  return useQuery<SellerMovementsBalanceResponse, ApiError>({
    queryKey: sellerMovementsBalanceQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getSellerMovementsBalance(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
