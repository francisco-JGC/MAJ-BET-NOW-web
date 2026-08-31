import { useQuery } from '@tanstack/react-query';

import { getBranchFlow } from '@/features/movements/api/movements.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  BranchFlowParams,
  BranchFlowResponse,
} from '@/features/movements/types';
import type { ApiError } from '@/shared/types/api';

export const branchFlowQueryKeys = {
  all: ['branch-flow'] as const,
  list: (params: BranchFlowParams) =>
    [...branchFlowQueryKeys.all, 'list', params] as const,
};

export function useBranchFlow(params: BranchFlowParams | null) {
  return useQuery<BranchFlowResponse, ApiError>({
    queryKey: params
      ? branchFlowQueryKeys.list(params)
      : [...branchFlowQueryKeys.all, 'disabled'],
    enabled: params !== null,
    queryFn: async () => {
      try {
        return await getBranchFlow(params!);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
