/** Wire error shape returned by the backend's DomainExceptionFilter. */
export interface BackendErrorBody {
  message?: string;
  error?: string;
  statusCode?: number;
}

/** Uniform error consumed by the UI. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value
  );
}

/** Paginated response envelope used by the tickets list endpoint. */
export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
