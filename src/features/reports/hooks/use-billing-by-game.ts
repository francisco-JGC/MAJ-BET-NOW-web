import { useQuery } from '@tanstack/react-query';

import { getBillingByGame } from '@/features/reports/api/reports.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  BillingByGameParams,
  BillingByGameResponse,
} from '@/features/reports/types';
import type { ApiError } from '@/shared/types/api';

export const billingByGameQueryKeys = {
  all: ['billing-by-game'] as const,
  list: (params: BillingByGameParams) =>
    [...billingByGameQueryKeys.all, 'list', params] as const,
};

export function useBillingByGame(params: BillingByGameParams) {
  return useQuery<BillingByGameResponse, ApiError>({
    queryKey: billingByGameQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getBillingByGame(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
