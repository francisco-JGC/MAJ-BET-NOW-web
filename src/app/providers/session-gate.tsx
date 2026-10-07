import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  PROACTIVE_REFRESH_WINDOW_MS,
  SESSION_WATCH_INTERVAL_MS,
} from '@/features/auth/constants';
import { bootstrapSession, refreshSession } from '@/features/auth/session';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { isTokenExpired } from '@/shared/lib/jwt';

/**
 * Evalúa la sesión guardada ANTES de montar el router.
 *
 * Al entrar a la app (en cualquier ruta, login incluido) leemos el token
 * del dispositivo: si sigue vigente seguimos de largo; si venció, hacemos
 * el refresh acá mismo. Recién cuando eso termina renderizamos el router,
 * así `ProtectedRoute` y `LoginPage` deciden sobre una sesión ya resuelta
 * y no sobre una a medio hidratar — que era lo que mandaba al login a
 * usuarios con credenciales perfectamente válidas.
 *
 * También deja corriendo un vigilante que renueva el token al volver a la
 * pestaña, para que una sesión abierta toda la noche no se encuentre con
 * un token vencido en el primer click de la mañana.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void bootstrapSession().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useSessionWatcher(ready);

  if (!ready) return <SessionSplash />;
  return <>{children}</>;
}

/**
 * Renueva el access token de forma proactiva cuando la pestaña vuelve a
 * primer plano o recupera conexión. Los fallos se ignoran a propósito: el
 * interceptor ya sabe reintentar, y acá un error de red no debe tener
 * ninguna consecuencia visible.
 */
function useSessionWatcher(enabled: boolean) {
  const hasSession = useAuthStore((s) => s.session !== null);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !hasSession) return;

    const maybeRefresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (running.current) return;
      const token = useAuthStore.getState().session?.token;
      if (!isTokenExpired(token, PROACTIVE_REFRESH_WINDOW_MS)) return;

      running.current = true;
      void refreshSession()
        .catch(() => undefined)
        .finally(() => {
          running.current = false;
        });
    };

    document.addEventListener('visibilitychange', maybeRefresh);
    window.addEventListener('focus', maybeRefresh);
    window.addEventListener('online', maybeRefresh);
    // Chequeo periódico para la pestaña que queda abierta y enfocada.
    const interval = window.setInterval(
      maybeRefresh,
      SESSION_WATCH_INTERVAL_MS,
    );

    return () => {
      document.removeEventListener('visibilitychange', maybeRefresh);
      window.removeEventListener('focus', maybeRefresh);
      window.removeEventListener('online', maybeRefresh);
      window.clearInterval(interval);
    };
  }, [enabled, hasSession]);
}

function SessionSplash() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
