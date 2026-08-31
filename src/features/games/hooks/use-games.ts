import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createSchedule,
  deleteSchedule,
  listGames,
  listSchedulesByGame,
  toggleGame,
  updateSchedule,
} from '@/features/games/api/games.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  CreateSchedulePayload,
  DrawSchedule,
  Game,
  UpdateSchedulePayload,
} from '@/features/games/types';
import type { ApiError } from '@/shared/types/api';

export const gamesQueryKeys = {
  all: ['games'] as const,
  list: (onlyActive: boolean) =>
    [...gamesQueryKeys.all, 'list', { onlyActive }] as const,
  schedules: (gameId: string) =>
    [...gamesQueryKeys.all, 'schedules', gameId] as const,
};

export function useGames(onlyActive = false) {
  return useQuery<Game[], ApiError>({
    queryKey: gamesQueryKeys.list(onlyActive),
    queryFn: async () => {
      try {
        return await listGames(onlyActive);
      } catch (error) {
        throw toApiError(error);
      }
    },
    // Games catalog cambia rara vez; con 5 min alcanza y evita flicker al
    // volver a la página.
    staleTime: 5 * 60 * 1000,
  });
}

export function useToggleGame() {
  const qc = useQueryClient();
  return useMutation<Game, ApiError, { id: string; active: boolean }>({
    mutationFn: async ({ id, active }) => {
      try {
        return await toggleGame(id, active);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (game) => {
      toast.success(
        game.isActive
          ? `Juego "${game.name}" activado`
          : `Juego "${game.name}" desactivado`,
      );
      qc.invalidateQueries({ queryKey: gamesQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el juego', {
        description: error.message,
      });
    },
  });
}

export function useGameSchedules(gameId: string | null) {
  return useQuery<DrawSchedule[], ApiError>({
    queryKey: gamesQueryKeys.schedules(gameId ?? ''),
    enabled: gameId !== null,
    queryFn: async () => {
      try {
        return await listSchedulesByGame(gameId!);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}

export function useCreateSchedule(gameId: string) {
  const qc = useQueryClient();
  return useMutation<
    DrawSchedule,
    ApiError,
    CreateSchedulePayload
  >({
    mutationFn: async (payload) => {
      try {
        return await createSchedule(gameId, payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success('Horario agregado');
      qc.invalidateQueries({ queryKey: gamesQueryKeys.schedules(gameId) });
    },
    onError: (error) => {
      toast.error('No se pudo agregar el horario', {
        description: error.message,
      });
    },
  });
}

export function useUpdateSchedule(gameId: string) {
  const qc = useQueryClient();
  return useMutation<
    DrawSchedule,
    ApiError,
    { id: string; payload: UpdateSchedulePayload; successMessage?: string }
  >({
    mutationFn: async ({ id, payload }) => {
      try {
        return await updateSchedule(id, payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (_updated, variables) => {
      toast.success(variables.successMessage ?? 'Horario actualizado');
      qc.invalidateQueries({ queryKey: gamesQueryKeys.schedules(gameId) });
    },
    onError: (error) => {
      toast.error('No se pudo actualizar el horario', {
        description: error.message,
      });
    },
  });
}

export function useDeleteSchedule(gameId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await deleteSchedule(id);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success('Horario eliminado');
      qc.invalidateQueries({ queryKey: gamesQueryKeys.schedules(gameId) });
    },
    onError: (error) => {
      toast.error('No se pudo eliminar el horario', {
        description: error.message,
      });
    },
  });
}
