import axios, { AxiosError } from 'axios';

import {
  AUTH_ENDPOINTS,
  REFRESH_RETRY_DELAYS_MS,
  REFRESH_TIMEOUT_MS,
} from '@/features/auth/constants';
import {
  forceLogout,
  getRefreshToken,
  updateTokens,
  useAuthStore,
} from '@/features/auth/store/auth.store';
import { env } from '@/shared/constants/env';
import { isTokenExpired } from '@/shared/lib/jwt';

/**
 * Dueño único del ciclo de vida de la sesión.
 *
 * Toda renovación de tokens pasa por acá. El objetivo es que el usuario
 * SOLO vea la pantalla de login cuando el backend rechaza explícitamente
 * su refresh token. Un problema de red, un 502 o un cold start del backend
 * nunca deben borrar la sesión: el refresh token sigue siendo válido y
 * vamos a poder usarlo en el próximo intento.
 *
 * El refresh usa un axios propio, sin interceptores, por dos razones:
 * no re-entrar al interceptor de 401 (recursión), y poder darle un timeout
 * más generoso que el resto de la app — la primera llamada del día suele
 * caer sobre un contenedor dormido.
 */
const refreshClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: REFRESH_TIMEOUT_MS,
});

/** El backend rechazó el refresh token. La sesión está muerta de verdad. */
export class SessionExpiredError extends Error {
  constructor(message = 'La sesión expiró') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/**
 * No pudimos renovar por algo ajeno al usuario (red caída, backend
 * reiniciando, timeout). La sesión queda intacta y se reintenta después.
 */
export class RefreshUnavailableError extends Error {
  constructor(message = 'No se pudo contactar al servidor') {
    super(message);
    this.name = 'RefreshUnavailableError';
  }
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Un solo POST /auth/refresh. Traduce el fallo a uno de nuestros dos
 * errores: rechazo real vs problema transitorio.
 */
async function postRefresh(refreshToken: string): Promise<RefreshResponse> {
  try {
    const { data } = await refreshClient.post<RefreshResponse>(
      AUTH_ENDPOINTS.refresh,
      { refreshToken },
    );
    if (!data?.accessToken || !data?.refreshToken) {
      // Respuesta 200 pero malformada — no es culpa del token.
      throw new RefreshUnavailableError('Respuesta de refresh inválida');
    }
    return data;
  } catch (error) {
    if (error instanceof RefreshUnavailableError) throw error;

    const status = (error as AxiosError).response?.status;

    // 401/403 = el backend miró el token y dijo que no. Único caso en que
    // cerramos sesión.
    if (status === 401 || status === 403) {
      throw new SessionExpiredError();
    }

    // Sin `response` es red/timeout/CORS. Con 5xx es el servidor. En ambos
    // casos el refresh token sigue siendo bueno.
    throw new RefreshUnavailableError();
  }
}

/** Reintenta `postRefresh` mientras el fallo sea transitorio. */
async function postRefreshWithRetries(
  refreshToken: string,
): Promise<RefreshResponse> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await postRefresh(refreshToken);
    } catch (error) {
      // Un rechazo explícito no se reintenta: la respuesta no va a cambiar.
      if (error instanceof SessionExpiredError) throw error;
      lastError = error;
      if (attempt < REFRESH_RETRY_DELAYS_MS.length) {
        await sleep(REFRESH_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new RefreshUnavailableError();
}

/**
 * Refresh deduplicado. Si varias llamadas coinciden (típico: el dashboard
 * dispara ocho queries al montar) todas esperan el MISMO request.
 */
let inflight: Promise<string> | null = null;

export function refreshSession(): Promise<string> {
  if (inflight) return inflight;

  inflight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new SessionExpiredError('No hay refresh token');

    const tokens = await postRefreshWithRetries(refreshToken);
    // Guardamos AMBOS: el backend rota el refresh token en cada llamada y
    // quedarse con el viejo hace que la sesión caduque a fecha fija en vez
    // de ir extendiéndose con el uso.
    updateTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Devuelve un access token usable, renovándolo si hace falta.
 *
 * - Sin sesión → null (el llamador decide si redirige).
 * - Token vigente → se devuelve tal cual.
 * - Token vencido o por vencer → se refresca antes de devolverlo.
 *
 * Esto es lo que evita la ráfaga de 401 en paralelo: preguntamos ANTES de
 * mandar el request, no después de que el servidor nos rebote.
 */
export async function ensureValidAccessToken(): Promise<string | null> {
  const session = useAuthStore.getState().session;
  if (!session) return null;

  if (!isTokenExpired(session.token)) return session.token;

  return refreshSession();
}

/**
 * Evaluación de sesión al entrar a la app (cualquier ruta, login incluido).
 *
 * Resuelve `true` si al terminar hay una sesión utilizable. Solo limpia la
 * sesión cuando el backend rechaza el refresh token; si el servidor no
 * responde preferimos dejar entrar al usuario con lo que tenemos y que el
 * interceptor reintente — es mucho mejor que mandarlo al login y hacerle
 * perder credenciales que siguen siendo válidas.
 */
export async function bootstrapSession(): Promise<boolean> {
  const session = useAuthStore.getState().session;
  if (!session) return false;

  if (!isTokenExpired(session.token)) return true;

  try {
    await refreshSession();
    return true;
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      forceLogout();
      return false;
    }
    // Backend inalcanzable: conservamos la sesión.
    return true;
  }
}
