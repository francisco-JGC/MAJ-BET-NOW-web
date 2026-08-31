import { Loader2, Settings2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import {
  useFeatureFlags,
  useSetFeatureFlag,
} from '@/features/feature-flags/hooks/use-feature-flags';
import { UserRole } from '@/features/users/types';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

import type { FeatureFlag } from '@/features/feature-flags/types';

/**
 * Etiquetas amigables por key. El backend transporta `description` con el
 * texto largo; acá agregamos el título corto en español. Si un flag nuevo
 * aparece sin entrada acá, cae al fallback `humanize(key)`.
 */
const FLAG_LABELS: Record<string, string> = {
  nightly_lock: 'Cierre nocturno de juegos',
};

function labelFor(flag: FeatureFlag): string {
  const custom = FLAG_LABELS[flag.key];
  if (custom) return custom;
  return flag.key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function SystemConfigPage() {
  const session = useSession();
  const { data, isLoading, error } = useFeatureFlags();
  const setFlag = useSetFeatureFlag();

  // Solo admin puede administrar flags. Si un partner cae por URL directa
  // lo mandamos a la home en vez de mostrar la pantalla genérica de acceso
  // restringido, que tiene un texto pensado para vendedores.
  if (session && session.user.role !== UserRole.ADMIN) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <Settings2 className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-black tracking-tight">
          Configuración del sistema
        </h1>
      </header>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Toggles operativos que afectan cómo el móvil y el backend evalúan
        reglas de negocio. Los cambios se aplican en unos segundos en el
        backend; el móvil los toma al reiniciar o al volver a foreground.
      </p>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar la configuración: {error.message}
        </div>
      )}

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}

        {(data ?? []).map((flag) => {
          const isPending =
            setFlag.isPending && setFlag.variables?.key === flag.key;
          return (
            <div
              key={flag.key}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">
                  {labelFor(flag)}
                </div>
                {flag.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {flag.description}
                  </p>
                )}
                <div className="mt-2 text-[10px] font-mono text-muted-foreground/70">
                  {flag.key}
                </div>
              </div>

              <Toggle
                checked={flag.enabled}
                busy={isPending}
                onChange={(next) =>
                  setFlag.mutate({ key: flag.key, enabled: next })
                }
              />
            </div>
          );
        })}

        {!isLoading && (data ?? []).length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center text-sm text-muted-foreground">
            No hay flags configuradas.
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  busy,
  onChange,
}: {
  checked: boolean;
  busy: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !busy && onChange(!checked)}
      disabled={busy}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
        busy && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      >
        {busy && <Loader2 className="size-3 animate-spin text-slate-500" />}
      </span>
    </button>
  );
}
