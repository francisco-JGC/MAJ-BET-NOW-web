import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  deleteSaleLimitByNumber,
  listSaleLimitsByNumber,
  upsertSaleLimitByNumber,
} from '@/features/sale-limits-by-number/api/sale-limits-by-number.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SaleLimitByNumber,
  UpsertSaleLimitByNumberPayload,
} from '@/features/sale-limits-by-number/types';
import type { ApiError } from '@/shared/types/api';

export const saleLimitsByNumberKeys = {
  all: ['sale-limits-by-number'] as const,
  list: (salePointId: string) =>
    [...saleLimitsByNumberKeys.all, 'list', salePointId] as const,
};

export function useSaleLimitsByNumber(salePointId: string | null) {
  return useQuery<SaleLimitByNumber[], ApiError>({
    queryKey: saleLimitsByNumberKeys.list(salePointId ?? ''),
    queryFn: async () => {
      try {
        return await listSaleLimitsByNumber(salePointId!);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!salePointId,
  });
}

export function useUpsertSaleLimitByNumber() {
  const qc = useQueryClient();
  return useMutation<SaleLimitByNumber, ApiError, UpsertSaleLimitByNumberPayload>({
    mutationFn: async (payload) => {
      try {
        return await upsertSaleLimitByNumber(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (limit) => {
      qc.invalidateQueries({
        queryKey: saleLimitsByNumberKeys.list(limit.salePointId),
      });
    },
    onError: (error) => {
      toast.error('No se pudo guardar el tope', {
        description: error.message,
      });
    },
  });
}

export function useDeleteSaleLimitByNumber(salePointId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteSaleLimitByNumber(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: saleLimitsByNumberKeys.list(salePointId),
      });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar el tope', {
        description: error.message,
      });
    },
  });
}
