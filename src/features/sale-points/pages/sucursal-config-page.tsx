import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Hash,
  Loader2,
  MapPin,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import { GamePrizeRow } from '@/features/game-prizes/components/game-prize-row';
import { useEffectiveGamePrizes } from '@/features/game-prizes/hooks/use-game-prizes';
import { useGames } from '@/features/games/hooks/use-games';
import { LimitRow } from '@/features/sale-limits/components/limit-row';
import { useSaleLimits } from '@/features/sale-limits/hooks/use-sale-limits';
import { LimitsByNumberSection } from '@/features/sale-limits-by-number/components/limits-by-number-section';
import { SellerQuotasSection } from '@/features/sale-limits-by-seller-number/components/seller-quotas-section';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

import { UserRole } from '@/features/users/types';

import type { SalePoint } from '@/features/sale-points/types';

/**
 * Per-sucursal settings page. Vertical section nav on the left, chosen
 * section's content on the right. Structured this way so new categories
 * (cutoff overrides, printer bindings, etc.) plug in without redesigning.
 */
interface SectionDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * Roles con acceso a esta sección. Omitir = admin-only.
   */
  roles?: readonly UserRole[];
}

const SECTIONS: readonly SectionDef[] = [
  {
    key: 'sale-limits',
    label: 'Límites de venta',
    description: 'Tope general en córdobas por número por sorteo',
    icon: ShieldAlert,
  },
  {
    key: 'sale-limits-by-number',
    label: 'Límites por número',
    description: 'Tope específico para un número puntual (prevalece)',
    icon: Hash,
  },
  {
    key: 'seller-quotas',
    label: 'Cuotas por vendedor',
    description: 'Reparte el tope por número entre los vendedores',
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.PARTNER],
  },
  {
    key: 'game-prizes',
    label: 'Premios por juego',
    description: 'Multiplicador de pago por juego',
    icon: Coins,
  },
] as const;

export function SucursalConfigPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSession();
  const role = session?.user.role;

  // Filtro las secciones por rol. Admin ve todas; partner solo la sección
  // de cuotas por vendedor (repartir el tope entre sus sellers).
  const visibleSections = useMemo(
    () =>
      SECTIONS.filter((s) => {
        if (!s.roles) return role === UserRole.ADMIN;
        return role !== undefined && s.roles.includes(role);
      }),
    [role],
  );
  const [selectedSection, setSelectedSection] = useState<string>('');

  const { data: salePoints, isLoading } = useSalePoints();

  // Rol no autorizado (seller) → fuera. Partners caen a las secciones
  // que su rol permita (por ahora solo "seller-quotas").
  if (role === UserRole.SELLER) {
    return <Navigate to={APP_ROUTES.sucursales} replace />;
  }
  const salePoint = useMemo(
    () => (salePoints ?? []).find((sp) => sp.id === id) ?? null,
    [salePoints, id],
  );

  // Si el rol no puede ver la sección seleccionada (o aún no eligió una)
  // caemos a la primera visible. Sin esto, un partner que entra al page
  // vería un contenido vacío porque `selectedSection` arranca en `''`.
  const effectiveSection = useMemo(() => {
    if (
      selectedSection &&
      visibleSections.some((s) => s.key === selectedSection)
    ) {
      return selectedSection;
    }
    return visibleSections[0]?.key ?? '';
  }, [selectedSection, visibleSections]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!salePoint) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
        <MapPin className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Sucursal no encontrada.
        </p>
        <Link
          to={APP_ROUTES.sucursales}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="size-3.5" />
          Volver a sucursales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.sucursales)}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Configuración
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {salePoint.name}
            </h1>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <SectionNav
          sections={visibleSections}
          selected={effectiveSection}
          onSelect={setSelectedSection}
        />
        <div>
          {effectiveSection === 'sale-limits' && (
            <SaleLimitsSection salePoint={salePoint} />
          )}
          {effectiveSection === 'sale-limits-by-number' && (
            <LimitsByNumberSection salePoint={salePoint} />
          )}
          {effectiveSection === 'seller-quotas' && (
            <SellerQuotasSection salePoint={salePoint} />
          )}
          {effectiveSection === 'game-prizes' && (
            <GamePrizesSection salePoint={salePoint} />
          )}
        </div>
      </div>
    </div>
  );
}

function SectionNav({
  sections,
  selected,
  onSelect,
}: {
  sections: readonly SectionDef[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="rounded-2xl border border-border bg-card p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <ul className="flex flex-col gap-1">
        {sections.map((s) => {
          const Icon = s.icon;
          const active = s.key === selected;
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onSelect(s.key)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    active
                      ? 'text-primary-foreground'
                      : 'text-foreground/60 group-hover:text-foreground',
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                <div className="min-w-0">
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      !active && 'text-foreground',
                    )}
                  >
                    {s.label}
                  </div>
                  <div
                    className={cn(
                      'text-[11px]',
                      active
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground/70',
                    )}
                  >
                    {s.description}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SaleLimitsSection({ salePoint }: { salePoint: SalePoint }) {
  const { data: games } = useGames();
  const { data: limits, isLoading, error } = useSaleLimits();

  const gamesActive = useMemo(
    () => (games ?? []).filter((g) => g.isActive),
    [games],
  );
  const limitByGameId = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof limits>[number]
    >();
    for (const l of limits ?? []) {
      if (l.salePointId === salePoint.id) map.set(l.gameId, l);
    }
    return map;
  }, [limits, salePoint.id]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Límites de venta
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tope en córdobas por número por sorteo. Al alcanzarse, el número
            queda bloqueado hasta el siguiente sorteo. Se resetea automáticamente.
            Celda vacía = sin límite.
          </p>
        </div>
        {limitByGameId.size > 0 && (
          <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            {limitByGameId.size} juego(s)
          </span>
        )}
      </div>

      {error ? (
        <div className="px-6 py-4 text-sm text-destructive">
          No se pudieron cargar los límites: {error.message}
        </div>
      ) : isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-5 animate-spin" />
        </div>
      ) : gamesActive.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Aún no hay juegos activos.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {gamesActive.map((game) => (
            <LimitRow
              key={game.id}
              gameId={game.id}
              gameName={game.name}
              salePointId={salePoint.id}
              existing={limitByGameId.get(game.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function GamePrizesSection({ salePoint }: { salePoint: SalePoint }) {
  const { data, isLoading, error } = useEffectiveGamePrizes(salePoint.id);
  const items = data?.items ?? [];
  const overrideCount = items.filter((i) => i.hasOverride).length;

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            Premios por juego
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Multiplicador aplicado al monto de la apuesta para calcular el
            premio. El placeholder muestra el default del juego. Vaciar los
            dos campos elimina el override y vuelve al default.
          </p>
        </div>
        {overrideCount > 0 && (
          <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            {overrideCount} personalizado(s)
          </span>
        )}
      </div>

      {error ? (
        <div className="px-6 py-4 text-sm text-destructive">
          No se pudieron cargar los premios: {error.message}
        </div>
      ) : isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Aún no hay juegos activos.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((prize) => (
            <GamePrizeRow
              key={prize.gameId}
              salePointId={salePoint.id}
              prize={prize}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
