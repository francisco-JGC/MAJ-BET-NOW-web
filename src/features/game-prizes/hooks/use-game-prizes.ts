import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  listEffectiveGamePrizes,
  upsertGamePrize,
} from '@/features/game-prizes/api/game-prizes.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  ListEffectiveGamePrizesResponse,
  UpsertGamePrizePayload,
} from '@/features/game-prizes/types';
import type { ApiError } from '@/shared/types/api';

export const gamePrizesQueryKeys = {
  all: ['game-prizes'] as const,
  bySalePoint: (salePointId: string) =>
    [...gamePrizesQueryKeys.all, 'by-sale-point', salePointId] as const,
};

export function useEffectiveGamePrizes(salePointId: string | null) {
  return useQuery<ListEffectiveGamePrizesResponse, ApiError>({
    queryKey: gamePrizesQueryKeys.bySalePoint(salePointId ?? ''),
    enabled: salePointId !== null,
    queryFn: async () => {
      try {
        return await listEffectiveGamePrizes(salePointId!);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}

export function useUpsertGamePrize() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, UpsertGamePrizePayload>({
    mutationFn: async (payload) => {
      try {
        await upsertGamePrize(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamePrizesQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo guardar el premio', {
        description: error.message,
      });
    },
  });
}
