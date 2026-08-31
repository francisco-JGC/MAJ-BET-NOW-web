import { http } from '@/shared/api/http';

import type {
  CreateSchedulePayload,
  DrawSchedule,
  Game,
  UpdateSchedulePayload,
} from '@/features/games/types';

export async function listGames(onlyActive = false): Promise<Game[]> {
  const { data } = await http.get<Game[]>('/games', {
    params: { onlyActive: onlyActive || undefined },
  });
  return data;
}

export async function toggleGame(
  id: string,
  active: boolean,
): Promise<Game> {
  const { data } = await http.patch<Game>(`/games/${id}/toggle`, { active });
  return data;
}

export async function listSchedulesByGame(
  gameId: string,
): Promise<DrawSchedule[]> {
  const { data } = await http.get<DrawSchedule[]>(
    `/games/${gameId}/schedules`,
  );
  return data;
}

export async function createSchedule(
  gameId: string,
  payload: CreateSchedulePayload,
): Promise<DrawSchedule> {
  const { data } = await http.post<DrawSchedule>(
    `/games/${gameId}/schedules`,
    payload,
  );
  return data;
}

export async function updateSchedule(
  id: string,
  payload: UpdateSchedulePayload,
): Promise<DrawSchedule> {
  const { data } = await http.patch<DrawSchedule>(
    `/schedules/${id}`,
    payload,
  );
  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  await http.delete(`/schedules/${id}`);
}
