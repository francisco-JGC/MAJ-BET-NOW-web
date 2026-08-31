import { useQuery } from '@tanstack/react-query';

import { getBranchTotals } from '@/features/reports/api/reports.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  BranchTotalsParams,
  BranchTotalsResponse,
} from '@/features/reports/types';
import type { ApiError } from '@/shared/types/api';

export const branchTotalsQueryKeys = {
  all: ['branch-totals'] as const,
  list: (params: BranchTotalsParams) =>
    [...branchTotalsQueryKeys.all, 'list', params] as const,
};

export function useBranchTotals(params: BranchTotalsParams) {
  return useQuery<BranchTotalsResponse, ApiError>({
    queryKey: branchTotalsQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getBranchTotals(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
