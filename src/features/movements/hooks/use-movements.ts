import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createMovement,
  deleteMovement,
  listMovements,
} from '@/features/movements/api/movements.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  CreateMovementPayload,
  ListMovementsParams,
  ListMovementsResponse,
  Movement,
} from '@/features/movements/types';
import type { ApiError } from '@/shared/types/api';

export const movementsQueryKeys = {
  all: ['movements'] as const,
  list: (params: ListMovementsParams) =>
    [...movementsQueryKeys.all, 'list', params] as const,
};

export function useMovements(params: ListMovementsParams) {
  return useQuery<ListMovementsResponse, ApiError>({
    queryKey: movementsQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await listMovements(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation<Movement, ApiError, CreateMovementPayload>({
    mutationFn: async (payload) => {
      try {
        return await createMovement(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success('Movimiento registrado');
      // Balance view depends on movements — invalidate both.
      qc.invalidateQueries({ queryKey: movementsQueryKeys.all });
      qc.invalidateQueries({ queryKey: ['movements-balance'] });
    },
    onError: (error) => {
      toast.error('No se pudo registrar el movimiento', {
        description: error.message,
      });
    },
  });
}

export function useDeleteMovement() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteMovement(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success('Movimiento eliminado');
      qc.invalidateQueries({ queryKey: movementsQueryKeys.all });
      qc.invalidateQueries({ queryKey: ['movements-balance'] });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar', {
        description: error.message,
      });
    },
  });
}
