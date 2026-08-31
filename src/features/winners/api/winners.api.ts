import { http } from '@/shared/api/http';

import type {
  ListWinnersParams,
  WinningTicket,
} from '@/features/winners/types';

export async function listWinningTickets(
  params: ListWinnersParams,
): Promise<WinningTicket[]> {
  const { data } = await http.get<WinningTicket[]>('/tickets/winners', {
    params: {
      gameId: params.gameId || undefined,
      salePointId: params.salePointId || undefined,
      sellerId: params.sellerId || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      drawTime: params.drawTime || undefined,
      search: params.search || undefined,
    },
  });
  return data;
}
