import { http } from '@/shared/api/http';

import type {
  ListWinnersParams,
  Ticket,
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

export async function markTicketAsPaid(ticketId: string): Promise<Ticket> {
  const { data } = await http.post<Ticket>(`/tickets/${ticketId}/pay`);
  return data;
}
