import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import '@/index.css';

/**
 * Auto-reload cuando un chunk lazy queda huérfano tras un deploy. El
 * escenario: usuario tiene la app cargada con hashes viejos, deployamos,
 * navega y `import()` intenta traer un chunk que ya no existe. El error
 * viene en varios sabores según browser/hosting:
 *
 *   - "Failed to fetch dynamically imported module"
 *   - "Importing a module script failed"
 *   - "'text/html' is not a valid JavaScript MIME type" (fallback SPA)
 *   - ChunkLoadError (Webpack, algunos Vite)
 *
 * Los enganchamos a nivel `window` porque React Router `errorElement` no
 * siempre atrapa rejections de `React.lazy()` (la Suspense está por encima
 * del router y la rejection puede escapar antes de llegar al boundary).
 *
 * Guard anti-loop: si reloadeamos hace menos de 30s, no volvemos a hacerlo
 * — algo persistente debería ir al UI del boundary y no meter al usuario
 * en un loop infinito.
 */
const CHUNK_ERROR_REGEX =
  /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed|not a valid JavaScript MIME type|error loading dynamically imported/i;

function reloadIfChunkError(message: string | undefined): boolean {
  if (!message || !CHUNK_ERROR_REGEX.test(message)) return false;
  const RELOAD_KEY = 'chunk_reload_at';
  const now = Date.now();
  const previous = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0');
  if (now - previous < 30_000) return false;
  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
  return true;
}

// Vite emite este evento específicamente cuando falla el preload de un
// chunk. Reload silencioso.
window.addEventListener('vite:preloadError', () => {
  reloadIfChunkError('Failed to fetch dynamically imported');
});

// Errores no-atrapados a nivel window (incluye promises rejeceted que
// nadie captó, y errores sincrónicos de scripts).
window.addEventListener('error', (event) => {
  reloadIfChunkError(event.message ?? String(event.error ?? ''));
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  reloadIfChunkError(message);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
