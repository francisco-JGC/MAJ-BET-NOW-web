import { useMemo, useState } from 'react';
import { Handshake, Loader2, MapPin, Plus, Search, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import { CreateSalePointModal } from '@/features/sale-points/components/create-sale-point-modal';
import { SalePointDetailsModal } from '@/features/sale-points/components/sale-point-details-modal';
import {
  useSalePoints,
  useToggleSalePoint,
} from '@/features/sale-points/hooks/use-sale-points';
import { useUsers } from '@/features/users/hooks/use-users';
import { sucursalConfigPath } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';
import {
  SegmentedControl,
  type SegmentTab,
} from '@/shared/ui/segmented-control';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import { UserRole } from '@/features/users/types';

import type { SalePoint } from '@/features/sale-points/types';
import type { User } from '@/features/users/types';

type StatusFilter = 'all' | 'active' | 'inactive';

const FILTER_TABS: readonly SegmentTab<StatusFilter>[] = [
  { key: 'all', label: 'Todas' },
  { key: 'active', label: 'Activas', tone: 'emerald' },
  { key: 'inactive', label: 'Inactivas', tone: 'rose' },
] as const;

export function SucursalesPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SalePoint | null>(null);

  const session = useSession();
  const isAdmin = session?.user.role === UserRole.ADMIN;

  // El admin ve inactivas para poder reactivarlas; partners ni siquiera
  // deberían verlas — el backend igual filtra su lado en cualquier caso.
  const { data, isLoading, isFetching, error } = useSalePoints({
    includeInactive: isAdmin,
  });
  const toggle = useToggleSalePoint();

  // Partners list only makes sense for the admin view (to resolve names
  // for the "Encargado" column). Partners see only their own sucursales,
  // so the extra fetch would return nothing useful and hits a role-gated
  // endpoint they can still call but that adds no value.
  const { data: partnersPage } = useUsers(
    { role: UserRole.PARTNER, limit: 100, offset: 0 },
  );
  const partnerById = useMemo(() => {
    const map = new Map<string, User>();
    for (const p of partnersPage?.items ?? []) map.set(p.id, p);
    return map;
  }, [partnersPage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((sp) => {
      if (filter === 'active' && !sp.isActive) return false;
      if (filter === 'inactive' && sp.isActive) return false;
      if (!q) return true;
      return (
        sp.name.toLowerCase().includes(q) ||
        sp.code.toLowerCase().includes(q)
      );
    });
  }, [data, filter, search]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      active: all.filter((sp) => sp.isActive).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Sucursales</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.active}</span>{' '}
            activas de{' '}
            <span className="font-semibold text-foreground">{stats.total}</span>
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" strokeWidth={2.8} />
              Nueva sucursal
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Filtrar sucursales"
          tabs={FILTER_TABS}
          value={filter}
          onChange={setFilter}
        />
        <div className="relative min-w-64 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar las sucursales: {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="relative overflow-x-auto">
          <table
            className={cn(
              'min-w-full text-sm transition-opacity',
              isFetching && (data?.length ?? 0) > 0 && 'opacity-50',
            )}
          >
            <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Sucursal</th>
                <th className="px-6 py-3">Código</th>
                {isAdmin && <th className="px-6 py-3">Encargado</th>}
                <th className="px-6 py-3 text-right">Acceso</th>
                <th className="w-12 px-2 py-3" aria-label="Configuración" />
                {/* Config link disponible para admin (todas las secciones)
                    y partner (solo la sección de cuotas por vendedor). */}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && filtered.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} showPartner={isAdmin} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    {search || filter !== 'all'
                      ? 'Ninguna sucursal coincide con tu búsqueda.'
                      : isAdmin
                        ? 'Aún no hay sucursales creadas.'
                        : 'Aún no tienes sucursales asignadas.'}
                  </td>
                </tr>
              ) : (
                filtered.map((sp) => (
                  <SucursalRow
                    key={sp.id}
                    salePoint={sp}
                    showPartner={isAdmin}
                    showConfig={true}
                    partnerName={
                      sp.ownerPartnerId
                        ? partnerById.get(sp.ownerPartnerId)?.name ?? null
                        : null
                    }
                    isToggling={
                      toggle.isPending && toggle.variables?.id === sp.id
                    }
                    onToggle={(next) =>
                      toggle.mutate({ id: sp.id, active: next })
                    }
                    onOpen={() => setSelected(sp)}
                  />
                ))
              )}
            </tbody>
          </table>

          <TableLoadingOverlay
            show={isFetching && (data?.length ?? 0) > 0}
          />
        </div>
      </div>

      {isAdmin && (
        <CreateSalePointModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
      <SalePointDetailsModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        salePoint={selected}
      />
    </div>
  );
}

function SucursalRow({
  salePoint,
  partnerName,
  showPartner,
  showConfig,
  isToggling,
  onToggle,
  onOpen,
}: {
  salePoint: SalePoint;
  partnerName: string | null;
  showPartner: boolean;
  showConfig: boolean;
  isToggling: boolean;
  onToggle: (next: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <tr
      onClick={onOpen}
      className={cn(
        'cursor-pointer transition',
        salePoint.isActive
          ? 'hover:bg-slate-50/60'
          : 'opacity-60 hover:bg-slate-50/40',
      )}
    >
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-black text-white">
            {salePoint.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-semibold text-foreground">
            {salePoint.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
          {salePoint.code}
        </span>
      </td>
      {showPartner && (
        <td className="px-6 py-3.5">
          {partnerName ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
              <Handshake className="size-3.5 text-indigo-600" />
              {partnerName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60">
              Sin asignar
            </span>
          )}
        </td>
      )}
      <td
        className="px-6 py-3.5 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <Toggle
          checked={salePoint.isActive}
          onChange={onToggle}
          disabled={isToggling}
          busy={isToggling}
          label={salePoint.isActive ? 'Activa' : 'Inactiva'}
        />
      </td>
      {showConfig && (
        <td
          className="w-12 px-2 py-3.5 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={sucursalConfigPath(salePoint.id)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Configuración"
            aria-label={`Configurar ${salePoint.name}`}
          >
            <Settings className="size-4" strokeWidth={2.2} />
          </Link>
        </td>
      )}
    </tr>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  busy,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition',
          checked ? 'bg-emerald-500' : 'bg-slate-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
          )}
        >
          {busy && <Loader2 className="size-3 animate-spin text-slate-500" />}
        </span>
      </button>
      <span
        className={cn(
          'text-xs font-semibold',
          checked ? 'text-emerald-700' : 'text-slate-500',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SkeletonRow({ showPartner }: { showPartner: boolean }) {
  // Config column siempre presente (admin ve toda la config, partner solo
  // la sección de cuotas). Partner: Sucursal + Código + Acceso + Config = 4.
  // Admin: + Encargado → 5.
  const cells = showPartner ? 5 : 4;
  return (
    <tr>
      {Array.from({ length: cells }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}
