import { Toaster } from 'sonner';

import { QueryProvider } from '@/app/providers/query-provider';
import { AppRouter } from '@/app/router';
import { GlobalProgress } from '@/shared/ui/global-progress';

export function App() {
  return (
    <QueryProvider>
      <GlobalProgress />
      <AppRouter />
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}
