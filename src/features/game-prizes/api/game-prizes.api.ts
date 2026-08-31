import { http } from '@/shared/api/http';

import type {
  ListEffectiveGamePrizesResponse,
  UpsertGamePrizePayload,
} from '@/features/game-prizes/types';

export async function listEffectiveGamePrizes(
  salePointId: string,
): Promise<ListEffectiveGamePrizesResponse> {
  const { data } = await http.get<ListEffectiveGamePrizesResponse>(
    '/sale-point-game-prizes',
    { params: { salePointId } },
  );
  return data;
}

export async function upsertGamePrize(
  payload: UpsertGamePrizePayload,
): Promise<void> {
  await http.put('/sale-point-game-prizes', payload);
}
