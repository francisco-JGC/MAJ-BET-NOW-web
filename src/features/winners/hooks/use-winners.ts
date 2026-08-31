import { useQuery } from '@tanstack/react-query';

import { listWinningTickets } from '@/features/winners/api/winners.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  ListWinnersParams,
  WinningTicket,
} from '@/features/winners/types';
import type { ApiError } from '@/shared/types/api';

export const winnersQueryKeys = {
  all: ['winners'] as const,
  list: (params: ListWinnersParams) =>
    [...winnersQueryKeys.all, 'list', params] as const,
};

export function useWinners(params: ListWinnersParams) {
  return useQuery<WinningTicket[], ApiError>({
    queryKey: winnersQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await listWinningTickets(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
  });
}
