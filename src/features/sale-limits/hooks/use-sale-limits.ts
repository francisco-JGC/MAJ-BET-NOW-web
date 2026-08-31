import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  deleteSaleLimit,
  listSaleLimits,
  upsertSaleLimit,
} from '@/features/sale-limits/api/sale-limits.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  SaleLimit,
  UpsertSaleLimitPayload,
} from '@/features/sale-limits/types';
import type { ApiError } from '@/shared/types/api';

export const saleLimitsQueryKeys = {
  all: ['sale-limits'] as const,
  list: () => [...saleLimitsQueryKeys.all, 'list'] as const,
};

export function useSaleLimits() {
  return useQuery<SaleLimit[], ApiError>({
    queryKey: saleLimitsQueryKeys.list(),
    queryFn: async () => {
      try {
        return await listSaleLimits();
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}

export function useUpsertSaleLimit() {
  const qc = useQueryClient();
  return useMutation<SaleLimit, ApiError, UpsertSaleLimitPayload>({
    mutationFn: async (payload) => {
      try {
        return await upsertSaleLimit(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleLimitsQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo guardar el límite', {
        description: error.message,
      });
    },
  });
}

export function useDeleteSaleLimit() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteSaleLimit(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saleLimitsQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar el límite', {
        description: error.message,
      });
    },
  });
}
