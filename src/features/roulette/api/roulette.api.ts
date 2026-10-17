import { http } from '@/shared/api/http';

import type {
  RouletteBoard,
  RouletteConfig,
  UpsertRouletteConfigPayload,
} from '@/features/roulette/types';

export async function getRouletteBoard(): Promise<RouletteBoard> {
  const { data } = await http.get<RouletteBoard>('/roulette/board');
  return data;
}

/** Config VIGENTE de una sucursal: la suya, la global, o el default. */
export async function getRouletteConfig(
  salePointId: string,
): Promise<RouletteConfig> {
  const { data } = await http.get<RouletteConfig>('/roulette/config', {
    params: { salePointId },
  });
  return data;
}

export async function upsertRouletteConfig(
  payload: UpsertRouletteConfigPayload,
): Promise<RouletteConfig> {
  const { data } = await http.put<RouletteConfig>('/roulette/config', payload);
  return data;
}
