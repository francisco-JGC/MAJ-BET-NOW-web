import { http } from '@/shared/api/http';

import type {
  CreateDrawResultPayload,
  DrawResult,
  ListDrawResultsParams,
  UpdateDrawResultPayload,
} from '@/features/draw-results/types';

export async function listDrawResults(
  params: ListDrawResultsParams,
): Promise<DrawResult[]> {
  const { data } = await http.get<DrawResult[]>('/draw-results', {
    params: {
      gameId: params.gameId || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      limit: params.limit,
      offset: params.offset,
    },
  });
  return data;
}

export async function createDrawResult(
  payload: CreateDrawResultPayload,
): Promise<DrawResult> {
  const { data } = await http.post<DrawResult>('/draw-results', payload);
  return data;
}

export async function updateDrawResult(
  id: string,
  payload: UpdateDrawResultPayload,
): Promise<DrawResult> {
  const { data } = await http.patch<DrawResult>(`/draw-results/${id}`, payload);
  return data;
}

export async function deleteDrawResult(id: string): Promise<void> {
  await http.delete(`/draw-results/${id}`);
}
