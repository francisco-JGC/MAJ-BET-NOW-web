import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';

import { AdminShell } from '@/app/layout/admin-shell';
import { ProtectedRoute } from '@/app/router/protected-route';
import { RoleGate } from '@/app/router/role-gate';
import { LoginPage } from '@/features/auth/pages/login-page';
import { UserRole } from '@/features/auth/types';
import { HomePage } from '@/features/home/pages/home-page';
import { APP_ROUTES } from '@/shared/constants/routes';

/**
 * Feature pages are code-split so the initial bundle stays small — the
 * shell, auth, and home ship eagerly; everything else downloads on demand
 * when the user navigates to it for the first time.
 *
 * LoginPage and HomePage stay eager because they're the entry points every
 * user hits — lazy-loading them just delays the first paint.
 */
const LatestResultsPage = lazy(() =>
  import('@/features/draw-results/pages/latest-results-page').then((m) => ({
    default: m.LatestResultsPage,
  })),
);
const DrawsPage = lazy(() =>
  import('@/features/games/pages/draws-page').then((m) => ({
    default: m.DrawsPage,
  })),
);
const BranchFlowPage = lazy(() =>
  import('@/features/movements/pages/branch-flow-page').then((m) => ({
    default: m.BranchFlowPage,
  })),
);
const ExpensesPage = lazy(() =>
  import('@/features/movements/pages/expenses-page').then((m) => ({
    default: m.ExpensesPage,
  })),
);
const MovementsBalancePage = lazy(() =>
  import('@/features/movements/pages/movements-balance-page').then((m) => ({
    default: m.MovementsBalancePage,
  })),
);
const MovementsPage = lazy(() =>
  import('@/features/movements/pages/movements-page').then((m) => ({
    default: m.MovementsPage,
  })),
);
const BillingPage = lazy(() =>
  import('@/features/reports/pages/billing-page').then((m) => ({
    default: m.BillingPage,
  })),
);
const BranchTotalsPage = lazy(() =>
  import('@/features/reports/pages/branch-totals-page').then((m) => ({
    default: m.BranchTotalsPage,
  })),
);
const SellerReportPage = lazy(() =>
  import('@/features/reports/pages/seller-report-page').then((m) => ({
    default: m.SellerReportPage,
  })),
);
const SalesByNumberPage = lazy(() =>
  import('@/features/sales-by-number/pages/sales-by-number-page').then((m) => ({
    default: m.SalesByNumberPage,
  })),
);
const SaleLimitsPage = lazy(() =>
  import('@/features/sale-limits/pages/sale-limits-page').then((m) => ({
    default: m.SaleLimitsPage,
  })),
);
const SucursalConfigPage = lazy(() =>
  import('@/features/sale-points/pages/sucursal-config-page').then((m) => ({
    default: m.SucursalConfigPage,
  })),
);
const SucursalesPage = lazy(() =>
  import('@/features/sale-points/pages/sucursales-page').then((m) => ({
    default: m.SucursalesPage,
  })),
);
const SystemConfigPage = lazy(() =>
  import('@/features/feature-flags/pages/system-config-page').then((m) => ({
    default: m.SystemConfigPage,
  })),
);
const SalesPage = lazy(() =>
  import('@/features/tickets/pages/sales-page').then((m) => ({
    default: m.SalesPage,
  })),
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/users-page').then((m) => ({
    default: m.UsersPage,
  })),
);
const WinnersPage = lazy(() =>
  import('@/features/winners/pages/winners-page').then((m) => ({
    default: m.WinnersPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Boundary global. Cuando el user tiene la app cargada y desplegamos una
 * versión nueva, los chunks lazy quedan con hashes viejos que ya no existen
 * en el server. Al navegar, el `import()` de esos chunks falla con un
 * `ChunkLoadError` (Vite) o "'text/html' is not a valid JavaScript MIME
 * type" (cuando el hosting cae al index.html fallback). Ambos casos → hard
 * reload; la página fresca resuelve los chunks nuevos.
 *
 * Guard contra loop: si ya intentamos reload una vez en esta sesión y el
 * error vuelve, no reloadeamos de nuevo — mostramos una UI para que el
 * usuario decida. Sin el guard, un error persistente (por ej. de red)
 * pondría la app en un loop infinito de reloads.
 */
function ChunkErrorBoundary() {
  const error = useRouteError();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  const looksLikeChunkError =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported|Importing a module script failed|not a valid JavaScript MIME type|error loading dynamically imported/i.test(
      message,
    );

  if (looksLikeChunkError) {
    const RELOAD_KEY = 'chunk_reload_at';
    const now = Date.now();
    const previous = Number(sessionStorage.getItem(RELOAD_KEY) ?? '0');
    // Si ya reloadeamos hace menos de 30s, no repetimos — probablemente
    // hay un problema persistente y necesitamos que el user vea la UI.
    if (now - previous > 30_000) {
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
      return <RouteFallback />;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-bold text-foreground">
        Ocurrió un error inesperado
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {looksLikeChunkError
          ? 'La aplicación se actualizó mientras tenías la página abierta. Recargá para continuar.'
          : message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
      >
        Recargar
      </button>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: APP_ROUTES.login,
    element: <LoginPage />,
    errorElement: <ChunkErrorBoundary />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ChunkErrorBoundary />,
    children: [
      {
        element: <RoleGate allow={[UserRole.ADMIN, UserRole.PARTNER]} />,
        children: [
          {
            element: <AdminShell />,
            children: [
              {
                path: APP_ROUTES.root,
                element: <Navigate to={APP_ROUTES.home} replace />,
              },
              { path: APP_ROUTES.home, element: <HomePage /> },
              { path: APP_ROUTES.sales, element: <SalesPage /> },
              { path: APP_ROUTES.branchTotals, element: <BranchTotalsPage /> },
              { path: APP_ROUTES.sellerReport, element: <SellerReportPage /> },
              { path: APP_ROUTES.branchFlowReport, element: <BranchFlowPage /> },
              { path: APP_ROUTES.billing, element: <BillingPage /> },
              { path: APP_ROUTES.salesByNumber, element: <SalesByNumberPage /> },
              { path: APP_ROUTES.winners, element: <WinnersPage /> },
              { path: APP_ROUTES.expenses, element: <ExpensesPage /> },
              { path: APP_ROUTES.movements, element: <MovementsPage /> },
              { path: APP_ROUTES.movementsCalc, element: <MovementsBalancePage /> },
              { path: APP_ROUTES.users, element: <UsersPage /> },
              { path: APP_ROUTES.sucursales, element: <SucursalesPage /> },
              { path: APP_ROUTES.sucursalConfig, element: <SucursalConfigPage /> },
              // Rutas admin-only. Un partner que pega estas URLs cae a
              // home — mismo criterio que el sidebar-nav, que también
              // las oculta a partners.
              {
                element: (
                  <RoleGate
                    allow={[UserRole.ADMIN]}
                    redirectTo={APP_ROUTES.home}
                  />
                ),
                children: [
                  { path: APP_ROUTES.draws, element: <DrawsPage /> },
                  { path: APP_ROUTES.saleLimits, element: <SaleLimitsPage /> },
                  { path: APP_ROUTES.latestResults, element: <LatestResultsPage /> },
                  { path: APP_ROUTES.systemConfig, element: <SystemConfigPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={APP_ROUTES.home} replace /> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
