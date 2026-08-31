import { useQuery } from '@tanstack/react-query';

import { getSalesByNumber } from '@/features/sales-by-number/api/sales-by-number.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SalesByNumberParams,
  SalesByNumberResponse,
} from '@/features/sales-by-number/types';
import type { ApiError } from '@/shared/types/api';

export const salesByNumberQueryKeys = {
  all: ['sales-by-number'] as const,
  list: (params: SalesByNumberParams) =>
    [...salesByNumberQueryKeys.all, 'list', params] as const,
};

export function useSalesByNumber(params: SalesByNumberParams) {
  return useQuery<SalesByNumberResponse, ApiError>({
    queryKey: salesByNumberQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getSalesByNumber(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
