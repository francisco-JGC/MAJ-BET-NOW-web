import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  DoorOpen,
  ListChecks,
  MapPin,
  Plus,
  Scale,
  Tag,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';

import { CreateMovementModal } from '@/features/movements/components/create-movement-modal';
import {
  useDeleteMovement,
  useMovements,
} from '@/features/movements/hooks/use-movements';
import { MovementType } from '@/features/movements/types';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserRole } from '@/features/users/types';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { Movement } from '@/features/movements/types';
import type { SalePoint } from '@/features/sale-points/types';
import type { User } from '@/features/users/types';

const PAGE_SIZE = 20;

const MANAGUA = 'America/Managua';
const DATE_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatManaguaDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TYPE_META: Record<
  MovementType,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  [MovementType.EXPENSE]: {
    label: 'Gasto',
    classes: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
    icon: <ArrowDownRight className="size-3" strokeWidth={2.6} />,
  },
  [MovementType.DEPOSIT]: {
    label: 'Depósito',
    classes: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
    icon: <ArrowUpRight className="size-3" strokeWidth={2.6} />,
  },
  [MovementType.WITHDRAWAL]: {
    label: 'Retiro',
    classes: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
    icon: <Wallet className="size-3" strokeWidth={2.6} />,
  },
  [MovementType.OPENING]: {
    label: 'Apertura',
    classes: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
    icon: <DoorOpen className="size-3" strokeWidth={2.6} />,
  },
  [MovementType.CLOSING]: {
    label: 'Cierre',
    classes: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
    icon: <DoorClosed className="size-3" strokeWidth={2.6} />,
  },
  [MovementType.ADJUSTMENT]: {
    label: 'Ajuste',
    classes: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
    icon: <Scale className="size-3" strokeWidth={2.6} />,
  },
};

/** Sign shown next to the amount so the reader knows if it adds or subtracts. */
const TYPE_SIGN: Record<MovementType, '+' | '-' | ''> = {
  [MovementType.EXPENSE]: '-',
  [MovementType.DEPOSIT]: '+',
  [MovementType.WITHDRAWAL]: '-',
  [MovementType.OPENING]: '',
  [MovementType.CLOSING]: '',
  [MovementType.ADJUSTMENT]: '',
};

export function MovementsPage() {
  const [salePointId, setSalePointId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [type, setType] = useState<MovementType | ''>('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      sellerId: sellerId || undefined,
      type: (type || undefined) as MovementType | undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
      page: page + 1,
      limit: PAGE_SIZE,
    }),
    [salePointId, sellerId, type, from, to, page],
  );

  const { data, isLoading, isFetching, error } = useMovements(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: salePoints } = useSalePoints();
  const { data: usersPage } = useUsers({ limit: 200, offset: 0 });
  const { data: sellersPage } = useUsers({ role: UserRole.SELLER, limit: 200, offset: 0 });

  const salePointById = useMemo(() => {
    const m = new Map<string, SalePoint>();
    for (const sp of salePoints ?? []) m.set(sp.id, sp);
    return m;
  }, [salePoints]);
  const userById = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of usersPage?.items ?? []) m.set(u.id, u);
    return m;
  }, [usersPage]);

  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page + 1) * PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = rangeEnd < total;

  const deleteMovement = useDeleteMovement();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Movimientos</h1>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" strokeWidth={2.8} />
          Nuevo movimiento
        </button>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Sucursal">
            <Select
              value={salePointId}
              onChange={(v) => {
                setSalePointId(v);
                setSellerId('');
                setPage(0);
              }}
              leadingIcon={<MapPin className="size-4" />}
              placeholder="Todas"
              options={[
                { value: '', label: 'Todas las sucursales' },
                ...(salePoints?.map((sp) => ({
                  value: sp.id,
                  label: sp.name,
                })) ?? []),
              ]}
            />
          </Field>
          <Field label="Vendedor">
            <Select
              value={sellerId}
              onChange={(v) => {
                setSellerId(v);
                setSalePointId('');
                setPage(0);
              }}
              leadingIcon={<User className="size-4" />}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos los vendedores' },
                ...(sellersPage?.items.map((u) => ({
                  value: u.id,
                  label: u.name,
                })) ?? []),
              ]}
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={type}
              onChange={(v) => {
                setType(v as MovementType | '');
                setPage(0);
              }}
              leadingIcon={<Tag className="size-4" />}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos los tipos' },
                ...Object.entries(TYPE_META).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desde">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(0);
                }}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </Field>
          <Field label="Hasta">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(0);
                }}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </Field>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar los movimientos: {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="relative overflow-x-auto">
          <table
            className={cn(
              'min-w-full text-sm transition-opacity',
              isFetching && items.length > 0 && 'opacity-50',
            )}
          >
            <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Destino</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3">Registrado por</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    No hay movimientos en este rango.
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <MovementRow
                    key={m.id}
                    movement={m}
                    destinationName={
                      m.sellerId
                        ? userById.get(m.sellerId)?.name ?? '—'
                        : salePointById.get(m.salePointId ?? '')?.name ?? '—'
                    }
                    destinationKind={m.sellerId ? 'seller' : 'branch'}
                    createdByName={
                      m.createdById
                        ? userById.get(m.createdById)?.name ?? '—'
                        : '—'
                    }
                    onDelete={() => deleteMovement.mutate(m.id)}
                    deleting={
                      deleteMovement.isPending &&
                      deleteMovement.variables === m.id
                    }
                  />
                ))
              )}
            </tbody>
          </table>

          <TableLoadingOverlay show={isFetching && items.length > 0} />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span>
            {isFetching ? (
              <span className="text-muted-foreground/70">Cargando…</span>
            ) : total === 0 ? (
              'Sin resultados'
            ) : (
              <>
                {rangeStart}–{rangeEnd} de{' '}
                <span className="font-semibold text-foreground">{total}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev}
              className={cn(
                'flex size-8 items-center justify-center rounded-md',
                hasPrev
                  ? 'text-foreground hover:bg-secondary'
                  : 'cursor-not-allowed text-muted-foreground/40',
              )}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className={cn(
                'flex size-8 items-center justify-center rounded-md',
                hasNext
                  ? 'text-foreground hover:bg-secondary'
                  : 'cursor-not-allowed text-muted-foreground/40',
              )}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </footer>
      </div>

      <CreateMovementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

function MovementRow({
  movement,
  destinationName,
  destinationKind,
  createdByName,
  onDelete,
  deleting,
}: {
  movement: Movement;
  destinationName: string;
  destinationKind: 'branch' | 'seller';
  createdByName: string;
  onDelete: () => void;
  deleting: boolean;
}) {
  const meta = TYPE_META[movement.type];
  const sign = TYPE_SIGN[movement.type];
  const amountColor =
    sign === '+'
      ? 'text-emerald-700'
      : sign === '-'
        ? 'text-rose-700'
        : 'text-foreground';
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5 text-muted-foreground">
        {formatManaguaDate(movement.occurredAt)}
      </td>
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-1.5">
          {destinationKind === 'seller'
            ? <User className="size-3.5 shrink-0 text-indigo-500" />
            : <MapPin className="size-3.5 shrink-0 text-emerald-600" />}
          <span className="text-foreground">{destinationName}</span>
        </div>
      </td>
      <td className="px-6 py-3.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
            meta.classes,
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
      </td>
      <td className="max-w-xs truncate px-6 py-3.5 text-muted-foreground">
        {movement.description || <span className="text-muted-foreground/50">—</span>}
      </td>
      <td className={cn('px-6 py-3.5 text-right tabular-nums font-semibold', amountColor)}>
        {sign}
        {formatCurrency(movement.amount)}
      </td>
      <td className="px-6 py-3.5 text-muted-foreground">{createdByName}</td>
      <td className="px-6 py-3.5 text-right">
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm('¿Eliminar este movimiento? No se puede deshacer.')
            ) {
              onDelete();
            }
          }}
          disabled={deleting}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/10',
            deleting && 'cursor-not-allowed opacity-60',
          )}
          aria-label="Eliminar"
        >
          <Trash2 className="size-3.5" strokeWidth={2.4} />
        </button>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
