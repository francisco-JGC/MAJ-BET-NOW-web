import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createDrawResult,
  deleteDrawResult,
  listDrawResults,
  updateDrawResult,
} from '@/features/draw-results/api/draw-results.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  CreateDrawResultPayload,
  DrawResult,
  ListDrawResultsParams,
  UpdateDrawResultPayload,
} from '@/features/draw-results/types';
import type { ApiError } from '@/shared/types/api';

export const drawResultsQueryKeys = {
  all: ['draw-results'] as const,
  list: (params: ListDrawResultsParams) =>
    [...drawResultsQueryKeys.all, 'list', params] as const,
};

export function useDrawResults(
  params: ListDrawResultsParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery<DrawResult[], ApiError>({
    queryKey: drawResultsQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await listDrawResults(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
    enabled: options.enabled ?? true,
  });
}

export function useCreateDrawResult() {
  const qc = useQueryClient();
  return useMutation<DrawResult, ApiError, CreateDrawResultPayload>({
    mutationFn: async (payload) => {
      try {
        return await createDrawResult(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (result) => {
      toast.success(`Resultado registrado (${result.winningNumber})`);
      qc.invalidateQueries({ queryKey: drawResultsQueryKeys.all });
      // Los pagos pendientes del dashboard se calculan a partir de los
      // resultados registrados; hay que refrescarlos.
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error('No se pudo registrar el resultado', {
        description: error.message,
      });
    },
  });
}

export function useUpdateDrawResult() {
  const qc = useQueryClient();
  return useMutation<
    DrawResult,
    ApiError,
    { id: string; payload: UpdateDrawResultPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      try {
        return await updateDrawResult(id, payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (result) => {
      toast.success(`Resultado actualizado (${result.winningNumber})`);
      qc.invalidateQueries({ queryKey: drawResultsQueryKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el resultado', {
        description: error.message,
      });
    },
  });
}

export function useDeleteDrawResult() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteDrawResult(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success('Resultado eliminado');
      qc.invalidateQueries({ queryKey: drawResultsQueryKeys.all });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar el resultado', {
        description: error.message,
      });
    },
  });
}
