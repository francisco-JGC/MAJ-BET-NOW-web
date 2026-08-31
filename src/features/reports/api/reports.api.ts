import { http } from '@/shared/api/http';

import type {
  BillingByGameParams,
  BillingByGameResponse,
  BranchTotalsParams,
  BranchTotalsResponse,
  SellerReportParams,
  SellerReportResponse,
} from '@/features/reports/types';

export async function getBillingByGame(
  params: BillingByGameParams,
): Promise<BillingByGameResponse> {
  const { data } = await http.get<BillingByGameResponse>(
    '/tickets/billing-by-game',
    {
      params: {
        salePointId: params.salePointId || undefined,
        sellerId: params.sellerId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}

export async function getBranchTotals(
  params: BranchTotalsParams,
): Promise<BranchTotalsResponse> {
  const { data } = await http.get<BranchTotalsResponse>(
    '/tickets/branch-totals',
    {
      params: {
        gameId: params.gameId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}

export async function getSellerReport(
  params: SellerReportParams,
): Promise<SellerReportResponse> {
  const { data } = await http.get<SellerReportResponse>(
    '/tickets/seller-report',
    {
      params: {
        salePointId: params.salePointId || undefined,
        salePointIds:
          params.salePointIds && params.salePointIds.length > 0
            ? params.salePointIds.join(',')
            : undefined,
        sellerId: params.sellerId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}
