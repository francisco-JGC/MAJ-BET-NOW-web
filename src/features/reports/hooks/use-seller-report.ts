import { useQuery } from '@tanstack/react-query';

import { getSellerReport } from '@/features/reports/api/reports.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SellerReportParams,
  SellerReportResponse,
} from '@/features/reports/types';
import type { ApiError } from '@/shared/types/api';

export const sellerReportQueryKeys = {
  all: ['seller-report'] as const,
  list: (params: SellerReportParams) =>
    [...sellerReportQueryKeys.all, 'list', params] as const,
};

export function useSellerReport(params: SellerReportParams) {
  return useQuery<SellerReportResponse, ApiError>({
    queryKey: sellerReportQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await getSellerReport(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
