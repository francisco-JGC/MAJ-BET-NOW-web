import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { refresh as refreshAccessToken } from '@/features/auth/api/auth.api';
import {
  forceLogout,
  getAuthToken,
  getRefreshToken,
  updateAccessToken,
} from '@/features/auth/store/auth.store';
import { env } from '@/shared/constants/env';
import { APP_ROUTES } from '@/shared/constants/routes';

/**
 * Single axios instance shared across the app.
 *
 * - Request interceptor attaches the JWT from the auth store.
 * - Response interceptor tries a silent refresh on 401 before giving up.
 *   Users only see the login screen when the refresh token itself expires
 *   (default 30 days), not every time the 24h access token turns over.
 *
 * Direct usage stays inside each feature's api folder. Components and
 * hooks call the api functions there, never this client.
 */
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
});

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * Deduped in-flight refresh. If multiple requests hit 401 concurrently
 * they all await the SAME refresh call — we don't want to burn N refresh
 * tokens (and if the backend ever adds rotation, this becomes critical).
 */
let inflightRefresh: Promise<string> | null = null;

async function refreshOnce(refreshToken: string): Promise<string> {
  if (!inflightRefresh) {
    inflightRefresh = refreshAccessToken(refreshToken).finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

/**
 * Extended axios config with our internal retry flag. `_retried` prevents
 * an infinite loop if the retried request ALSO 401s (which would mean the
 * refresh returned a token the server also rejects — real session death).
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

    // The refresh endpoint itself just 401'd → refresh token is dead.
    // Skip straight to forced logout.
    if (original.headers?.['X-Refresh-Attempt']) {
      finishWithLogout();
      return Promise.reject(error);
    }

    // Already retried once and still 401 → don't loop forever.
    if (original._retried) {
      finishWithLogout();
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      finishWithLogout();
      return Promise.reject(error);
    }

    try {
      const newToken = await refreshOnce(refreshToken);
      updateAccessToken(newToken);
      original._retried = true;
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return http.request(original);
    } catch {
      finishWithLogout();
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
