import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  findTicketById,
  listTickets,
  voidTicket,
} from '@/features/tickets/api/tickets.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  ListTicketsParams,
  ListTicketsResponse,
  Ticket,
  VoidTicketPayload,
} from '@/features/tickets/types';
import type { ApiError } from '@/shared/types/api';

export const ticketsQueryKeys = {
  all: ['tickets'] as const,
  list: (params: ListTicketsParams) =>
    [...ticketsQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...ticketsQueryKeys.all, 'detail', id] as const,
};

export function useTickets(params: ListTicketsParams) {
  return useQuery<ListTicketsResponse, ApiError>({
    queryKey: ticketsQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await listTickets(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}

export function useTicket(id: string | null) {
  return useQuery<Ticket, ApiError>({
    queryKey: ticketsQueryKeys.detail(id ?? ''),
    enabled: id !== null,
    queryFn: async () => {
      try {
        return await findTicketById(id!);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });
}

export function useVoidTicket() {
  const qc = useQueryClient();
  return useMutation<
    Ticket,
    ApiError,
    { id: string; payload: VoidTicketPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      try {
        return await voidTicket(id, payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (ticket) => {
      toast.success(`Ticket ${ticket.folio} anulado`);
      qc.invalidateQueries({ queryKey: ticketsQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo anular el ticket', {
        description: error.message,
      });
    },
  });
}
