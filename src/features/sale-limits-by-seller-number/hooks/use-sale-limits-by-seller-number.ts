import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  deleteSaleLimitBySellerNumber,
  listSaleLimitsBySellerNumber,
  upsertSaleLimitBySellerNumber,
} from '@/features/sale-limits-by-seller-number/api/sale-limits-by-seller-number.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SaleLimitBySellerNumber,
  UpsertSaleLimitBySellerNumberPayload,
} from '@/features/sale-limits-by-seller-number/types';
import type { ApiError } from '@/shared/types/api';

export const saleLimitsBySellerNumberKeys = {
  all: ['sale-limits-by-seller-number'] as const,
  list: (salePointId: string) =>
    [...saleLimitsBySellerNumberKeys.all, 'list', salePointId] as const,
};

export function useSaleLimitsBySellerNumber(salePointId: string | null) {
  return useQuery<SaleLimitBySellerNumber[], ApiError>({
    queryKey: saleLimitsBySellerNumberKeys.list(salePointId ?? ''),
    queryFn: async () => {
      try {
        return await listSaleLimitsBySellerNumber(salePointId!);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!salePointId,
  });
}

export function useUpsertSaleLimitBySellerNumber() {
  const qc = useQueryClient();
  return useMutation<
    SaleLimitBySellerNumber,
    ApiError,
    UpsertSaleLimitBySellerNumberPayload
  >({
    mutationFn: async (payload) => {
      try {
        return await upsertSaleLimitBySellerNumber(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (limit) => {
      qc.invalidateQueries({
        queryKey: saleLimitsBySellerNumberKeys.list(limit.salePointId),
      });
    },
    onError: (error) => {
      toast.error('No se pudo guardar la cuota', {
        description: error.message,
      });
    },
  });
}

export function useDeleteSaleLimitBySellerNumber(salePointId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteSaleLimitBySellerNumber(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: saleLimitsBySellerNumberKeys.list(salePointId),
      });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar la cuota', {
        description: error.message,
      });
    },
  });
}
