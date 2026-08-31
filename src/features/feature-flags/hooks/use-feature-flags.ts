import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  listFeatureFlags,
  setFeatureFlag,
} from '@/features/feature-flags/api/feature-flags.api';
import { toApiError } from '@/shared/api/error-mapper';

import type { FeatureFlag } from '@/features/feature-flags/types';
import type { ApiError } from '@/shared/types/api';

export const featureFlagsQueryKeys = {
  all: ['feature-flags'] as const,
  list: () => [...featureFlagsQueryKeys.all, 'list'] as const,
};

export function useFeatureFlags() {
  return useQuery<FeatureFlag[], ApiError>({
    queryKey: featureFlagsQueryKeys.list(),
    queryFn: async () => {
      try {
        return await listFeatureFlags();
      } catch (error) {
        throw toApiError(error);
      }
    },
    // Config raramente cambia — no vale la pena refetchearla en cada
    // navegación. Igual las mutaciones invalidan y re-fetchean.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetFeatureFlag() {
  const qc = useQueryClient();
  return useMutation<
    FeatureFlag,
    ApiError,
    { key: string; enabled: boolean }
  >({
    mutationFn: async ({ key, enabled }) => {
      try {
        return await setFeatureFlag(key, { enabled });
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (flag) => {
      toast.success(
        flag.enabled
          ? `"${flag.key}" activado`
          : `"${flag.key}" desactivado`,
      );
      qc.invalidateQueries({ queryKey: featureFlagsQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo cambiar la configuración', {
        description: error.message,
      });
    },
  });
}
