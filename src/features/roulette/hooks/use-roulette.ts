import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getRouletteBoard,
  listRoulettePlays,
  getRouletteConfig,
  upsertRouletteConfig,
} from '@/features/roulette/api/roulette.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  ListRoulettePlaysParams,
  ListRoulettePlaysResponse,
  RouletteBoard,
  RouletteConfig,
  UpsertRouletteConfigPayload,
} from '@/features/roulette/types';
import type { ApiError } from '@/shared/types/api';

export const rouletteKeys = {
  all: ['roulette'] as const,
  board: () => [...rouletteKeys.all, 'board'] as const,
  config: (salePointId: string | null) =>
    [...rouletteKeys.all, 'config', salePointId ?? 'global'] as const,
  plays: (params: ListRoulettePlaysParams) =>
    [...rouletteKeys.all, 'plays', params] as const,
};

export function useRoulettePlays(params: ListRoulettePlaysParams) {
  return useQuery<ListRoulettePlaysResponse, ApiError>({
    queryKey: rouletteKeys.plays(params),
    queryFn: async () => {
      try {
        return await listRoulettePlays(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}

export function useRouletteBoard() {
  return useQuery<RouletteBoard, ApiError>({
    queryKey: rouletteKeys.board(),
    queryFn: async () => {
      try {
        return await getRouletteBoard();
      } catch (error) {
        throw toApiError(error);
      }
    },
    // Las 38 casillas no cambian nunca.
    staleTime: Infinity,
  });
}

export function useRouletteConfig(salePointId: string | null) {
  return useQuery<RouletteConfig, ApiError>({
    queryKey: rouletteKeys.config(salePointId),
    queryFn: async () => {
      try {
        return await getRouletteConfig(salePointId!);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!salePointId,
  });
}

export function useUpsertRouletteConfig() {
  const qc = useQueryClient();
  return useMutation<RouletteConfig, ApiError, UpsertRouletteConfigPayload>({
    mutationFn: async (payload) => {
      try {
        return await upsertRouletteConfig(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      // Invalidamos TODO el namespace: cambiar la global altera la config
      // efectiva de cada sucursal que no tenga la suya.
      qc.invalidateQueries({ queryKey: rouletteKeys.all });
      toast.success('Configuración guardada');
    },
    onError: (error) => {
      toast.error('No se pudo guardar', { description: error.message });
    },
  });
}
