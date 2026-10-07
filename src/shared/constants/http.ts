/**
 * Timeout por defecto de los requests de la app.
 *
 * El refresh usa uno propio y más largo ({@link REFRESH_TIMEOUT_MS} en
 * `features/auth/constants.ts`): si el refresh se rindiera con este
 * timeout, un backend lento costaría la sesión.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
