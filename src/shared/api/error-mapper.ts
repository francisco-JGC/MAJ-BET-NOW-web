import { AxiosError } from 'axios';

import type { ApiError, BackendErrorBody } from '@/shared/types/api';

/**
 * Turns an axios error into the uniform {@link ApiError} the UI consumes.
 * The mapping keeps the surface small so components only handle one shape.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data as BackendErrorBody | undefined;
    return {
      status,
      code: body?.error ?? errorCodeFromStatus(status),
      message: body?.message ?? error.message ?? 'Unexpected error',
    };
  }
  if (error instanceof Error) {
    return { status: 0, code: 'UnknownError', message: error.message };
  }
  return { status: 0, code: 'UnknownError', message: String(error) };
}

function errorCodeFromStatus(status: number): string {
  if (status === 0) return 'NetworkError';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'NotFound';
  if (status >= 500) return 'ServerError';
  return 'ClientError';
}
