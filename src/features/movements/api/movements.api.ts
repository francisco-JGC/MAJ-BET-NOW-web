import { http } from '@/shared/api/http';

import type {
  BranchFlowParams,
  BranchFlowResponse,
  CreateMovementPayload,
  ListMovementsParams,
  ListMovementsResponse,
  Movement,
  MovementsBalanceParams,
  MovementsBalanceResponse,
  SellerMovementsBalanceParams,
  SellerMovementsBalanceResponse,
} from '@/features/movements/types';

export async function listMovements(
  params: ListMovementsParams,
): Promise<ListMovementsResponse> {
  const { data } = await http.get<ListMovementsResponse>('/movements', {
    params: {
      salePointId: params.salePointId || undefined,
      sellerId: params.sellerId || undefined,
      type: params.type || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      page: params.page,
      limit: params.limit,
    },
  });
  return data;
}

export async function createMovement(
  payload: CreateMovementPayload,
): Promise<Movement> {
  const { data } = await http.post<Movement>('/movements', payload);
  return data;
}

export async function deleteMovement(id: string): Promise<void> {
  await http.delete(`/movements/${id}`);
}

export async function getBranchFlow(
  params: BranchFlowParams,
): Promise<BranchFlowResponse> {
  const { data } = await http.get<BranchFlowResponse>(
    '/movements/branch-flow',
    {
      params: {
        salePointId: params.salePointId,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}

export async function getSellerMovementsBalance(
  params: SellerMovementsBalanceParams,
): Promise<SellerMovementsBalanceResponse> {
  const { data } = await http.get<SellerMovementsBalanceResponse>(
    '/movements/seller-balance',
    {
      params: {
        salePointIds:
          params.salePointIds && params.salePointIds.length > 0
            ? params.salePointIds.join(',')
            : undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}

export async function getMovementsBalance(
  params: MovementsBalanceParams,
): Promise<MovementsBalanceResponse> {
  const { data } = await http.get<MovementsBalanceResponse>(
    '/movements/balance',
    {
      params: {
        salePointId: params.salePointId || undefined,
        // Backend acepta CSV en `salePointIds`. Solo lo mandamos si hay al
        // menos un id — con lista vacía el server interpreta "sin filtro"
        // (que es el mismo comportamiento que omitirlo).
        salePointIds:
          params.salePointIds && params.salePointIds.length > 0
            ? params.salePointIds.join(',')
            : undefined,
        from: params.from || undefined,
        to: params.to || undefined,
      },
    },
  );
  return data;
}
