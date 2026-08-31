import { useQuery } from '@tanstack/react-query';

import { getMovementsBalance } from '@/features/movements/api/movements.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  MovementsBalanceParams,
  MovementsBalanceResponse,
} from '@/features/movements/types';
import type { ApiError } from '@/shared/types/api';

export const movementsBalanceQueryKeys = {
  all: ['movements-balance'] as const,
  list: (params: MovementsBalanceParams) =>
    [...movementsBalanceQueryKeys.all, 'list', params] as const,
};

export function useMovementsBalance(params: MovementsBalanceParams) {
  return useQuery<MovementsBalanceResponse, ApiError>({
    queryKey: movementsBalanceQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getMovementsBalance(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
