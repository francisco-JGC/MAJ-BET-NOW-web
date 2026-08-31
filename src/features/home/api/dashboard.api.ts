import { http } from '@/shared/api/http';

import type {
  DashboardSummary,
  DashboardSummaryParams,
} from '@/features/home/types';

/** GET /dashboard/summary — one call that powers the whole home screen. */
export async function getDashboardSummary(
  params: DashboardSummaryParams = {},
): Promise<DashboardSummary> {
  const { data } = await http.get<DashboardSummary>('/dashboard/summary', {
    params: {
      from: params.from,
      to: params.to,
    },
  });
  return data;
}
