import { useQuery } from '@tanstack/react-query';

import { getDashboardSummary } from '@/features/home/api/dashboard.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  DashboardSummary,
  DashboardSummaryParams,
} from '@/features/home/types';
import type { ApiError } from '@/shared/types/api';

/** Query key namespace for the home dashboard. */
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (params: DashboardSummaryParams = {}) =>
    [
      ...dashboardQueryKeys.all,
      'summary',
      params.from ?? null,
      params.to ?? null,
    ] as const,
};

/** Loads the aggregated home dashboard payload for the given date range. */
export function useDashboardSummary(params: DashboardSummaryParams = {}) {
  return useQuery<DashboardSummary, ApiError>({
    queryKey: dashboardQueryKeys.summary(params),
    queryFn: async () => {
      try {
        return await getDashboardSummary(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}
