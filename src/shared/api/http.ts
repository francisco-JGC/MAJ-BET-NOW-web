import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import {
  ensureValidAccessToken,
  refreshSession,
  SessionExpiredError,
} from '@/features/auth/session';
import { forceLogout, getAuthToken } from '@/features/auth/store/auth.store';
import { env } from '@/shared/constants/env';
import { DEFAULT_REQUEST_TIMEOUT_MS } from '@/shared/constants/http';
import { APP_ROUTES } from '@/shared/constants/routes';

/**
 * Instancia axios única de la app.
 *
 * - El interceptor de request renueva el access token ANTES de mandarlo si
 *   ya venció, en vez de esperar el 401. Así una pantalla que dispara ocho
 *   queries al montar hace un solo refresh en lugar de ocho 401 en ráfaga.
 * - El interceptor de response queda como red de seguridad para el 401 que
 *   igual se escape (relojes corridos, token revocado del lado servidor).
 *
 * Regla central: el usuario solo vuelve al login cuando el backend rechaza
 * explícitamente el refresh token ({@link SessionExpiredError}). Caídas de
 * red, timeouts y 5xx NO borran la sesión.
 *
 * El uso directo vive en el api/ de cada feature. Componentes y hooks
 * llaman a esas funciones, nunca a este cliente.
 */
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
});

http.interceptors.request.use(async (config) => {
  let token: string | null;
  try {
    token = await ensureValidAccessToken();
  } catch {
    // Si el refresh falló acá no decidimos nada: mandamos lo que haya y
    // dejamos que el interceptor de response clasifique la respuesta real
    // del servidor. Un fallo de red no debe cancelar el request.
    token = getAuthToken();
  }
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Config de axios extendida con nuestro flag de reintento. `_retried` evita
 * un loop infinito si el request reintentado TAMBIÉN da 401 (lo que
 * significaría que el servidor rechaza un token recién emitido).
 */
interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableRequestConfig | undefined;

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Ya reintentamos una vez y sigue en 401 → no insistir.
    if (original._retried) {
      finishWithLogout();
      return Promise.reject(error);
    }

    try {
      const newToken = await refreshSession();
      original._retried = true;
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return await http.request(original);
    } catch (refreshError) {
      // Única puerta al logout: el backend dijo que el refresh token no
      // sirve. Cualquier otra cosa (red, timeout, 502) deja la sesión viva
      // para reintentar en el próximo request.
      if (refreshError instanceof SessionExpiredError) {
        finishWithLogout();
      }
      return Promise.reject(error);
    }
  },
);

function finishWithLogout(): void {
  forceLogout();
  if (
    typeof window !== 'undefined' &&
    window.location.pathname !== APP_ROUTES.login
  ) {
    window.location.assign(APP_ROUTES.login);
  }
}
