/**
 * Parámetros del ciclo de vida de la sesión, en un solo lugar.
 *
 * Están acá y no esparcidos por `session.ts` / `session-gate.tsx` porque se
 * eligen en conjunto: los reintentos sumados tienen que caber dentro de lo
 * que un usuario tolera mirando el splash, y la ventana de refresh
 * proactivo tiene que ser mayor que el margen de expiración del token.
 */

/** Rutas de autenticación del backend. */
export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  refresh: '/auth/refresh',
} as const;

/**
 * Timeout del request de refresh. Más generoso que el del resto de la app:
 * la primera llamada del día suele despertar un contenedor dormido
 * (Railway suspende por inactividad y arrancar toma 15-25s).
 */
export const REFRESH_TIMEOUT_MS = 30_000;

/**
 * Backoff entre reintentos cuando el refresh falla por algo transitorio
 * (red, timeout, 5xx). Un rechazo explícito del backend no se reintenta.
 * La longitud del array define la cantidad de reintentos.
 */
export const REFRESH_RETRY_DELAYS_MS = [800, 2_400, 5_000] as const;

/**
 * Ventana de renovación proactiva: al volver a la pestaña renovamos si al
 * token le queda menos que esto. Tiene que ser mayor que el
 * `TOKEN_EXPIRY_SKEW_MS` de `shared/lib/jwt.ts`, para que la renovación
 * ocurra en segundo plano y no sobre un request ya en vuelo.
 */
export const PROACTIVE_REFRESH_WINDOW_MS = 5 * 60_000;

/** Cada cuánto revisa el vigilante en una pestaña abierta y enfocada. */
export const SESSION_WATCH_INTERVAL_MS = 5 * 60_000;
