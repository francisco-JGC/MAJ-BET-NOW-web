import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createUser,
  listUsers,
  updateUser,
} from '@/features/users/api/users.api';
import { toApiError } from '@/shared/api/error-mapper';

import type {
  CreateUserPayload,
  ListUsersParams,
  ListUsersResponse,
  UpdateUserPayload,
  User,
} from '@/features/users/types';
import type { ApiError } from '@/shared/types/api';

export const usersQueryKeys = {
  all: ['users'] as const,
  list: (params: ListUsersParams) =>
    [...usersQueryKeys.all, 'list', params] as const,
};

export function useUsers(params: ListUsersParams) {
  return useQuery<ListUsersResponse, ApiError>({
    queryKey: usersQueryKeys.list(params),
    queryFn: async () => {
      try {
        return await listUsers(params);
      } catch (error) {
        throw toApiError(error);
      }
    },
    placeholderData: (prev) => prev,
    // Users don't change often. 5-min cache dedupes the many components that
    // fetch the same role-scoped list (create/edit modals, filters, etc.).
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, CreateUserPayload>({
    mutationFn: async (payload) => {
      try {
        return await createUser(payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (user) => {
      toast.success(`Usuario "${user.name}" creado`);
      qc.invalidateQueries({ queryKey: usersQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudo crear el usuario', {
        description: error.message,
      });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation<
    User,
    ApiError,
    {
      id: string;
      payload: UpdateUserPayload;
      /**
       * Optional message to override the default toast. Used by the details
       * modal to say "Acceso bloqueado" / "Cambios guardados" depending on
       * which action triggered the mutation.
       */
      successMessage?: string;
    }
  >({
    mutationFn: async ({ id, payload }) => {
      try {
        return await updateUser(id, payload);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (_user, variables) => {
      toast.success(variables.successMessage ?? 'Cambios guardados');
      qc.invalidateQueries({ queryKey: usersQueryKeys.all });
    },
    onError: (error) => {
      toast.error('No se pudieron guardar los cambios', {
        description: error.message,
      });
    },
  });
}
