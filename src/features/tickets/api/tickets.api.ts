import { http } from '@/shared/api/http';

import type {
  ListTicketsParams,
  ListTicketsResponse,
  Ticket,
  VoidTicketPayload,
} from '@/features/tickets/types';

export async function listTickets(
  params: ListTicketsParams,
): Promise<ListTicketsResponse> {
  const { data } = await http.get<ListTicketsResponse>('/tickets', {
    params: {
      salePointId: params.salePointId || undefined,
      gameId: params.gameId || undefined,
      sellerId: params.sellerId || undefined,
      status: params.status || undefined,
      from: params.from || undefined,
      to: params.to || undefined,
      drawTime: params.drawTime || undefined,
      search: params.search || undefined,
    },
  });
  return data;
}

export async function findTicketById(id: string): Promise<Ticket> {
  const { data } = await http.get<Ticket>(`/tickets/${id}`);
  return data;
}

export async function voidTicket(
  id: string,
  payload: VoidTicketPayload,
): Promise<Ticket> {
  const { data } = await http.post<Ticket>(`/tickets/${id}/void`, payload);
  return data;
}
