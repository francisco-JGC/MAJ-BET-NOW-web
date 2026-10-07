import { Toaster } from 'sonner';

import { QueryProvider } from '@/app/providers/query-provider';
import { SessionGate } from '@/app/providers/session-gate';
import { AppRouter } from '@/app/router';
import { GlobalProgress } from '@/shared/ui/global-progress';

export function App() {
  return (
    <QueryProvider>
      <GlobalProgress />
      {/* Resuelve la sesión guardada (y la refresca si hace falta) antes
          de que el router decida a dónde mandar al usuario. */}
      <SessionGate>
        <AppRouter />
      </SessionGate>
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}
