import { useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Clock,
  Dices,
  MapPin,
  User as UserIcon,
} from 'lucide-react';

import { useGames, useGameSchedules } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useSalesByNumber } from '@/features/sales-by-number/hooks/use-sales-by-number';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserRole } from '@/features/auth/types';
import { cn } from '@/shared/lib/cn';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { DrawSchedule } from '@/features/games/types';

const MANAGUA_OFFSET = '-06:00';

const TIME_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: 'America/Managua',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Devuelve los horarios únicos del juego (e.g. "11:00", "15:00", "18:00",
 * "21:00"). No depende del rango de fechas — el filtro de fecha ya acota
 * el resultado; aquí solo mostramos qué sorteos existen.
 */
function generateDrawOptions(
  schedules: DrawSchedule[],
): Array<{ value: string; label: string }> {
  const active = schedules.filter((s) => s.isActive);
  if (active.length === 0) return [];

  const seen = new Set<string>();
  const options: Array<{ value: string; label: string }> = [];

  for (const s of active) {
    if (seen.has(s.drawTime)) continue;
    seen.add(s.drawTime);
    // Format using an arbitrary fixed date just to get the time label
    const label = TIME_FMT.format(
      new Date(`2000-01-01T${s.drawTime}:00${MANAGUA_OFFSET}`),
    );
    options.push({ value: s.drawTime, label });
  }

  return options.sort((a, b) => a.value.localeCompare(b.value));
}

export function BranchFlowPage() {
  const [salePointId, setSalePointId] = useState('');
  const [gameId, setGameId] = useState('');
  const [drawTime, setDrawTime] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  const { data: salePoints } = useSalePoints();
  const { data: games } = useGames();
  const { data: schedules } = useGameSchedules(gameId || null);
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 500,
    offset: 0,
  });

  const drawOptions = useMemo(
    () => generateDrawOptions(schedules ?? []),
    [schedules],
  );

  // Sellers filtered to the selected salePoint
  const sellers = useMemo(
    () =>
      (sellersPage?.items ?? []).filter(
        (u) => !salePointId || u.salePointId === salePointId,
      ),
    [sellersPage, salePointId],
  );

  // Query only when sucursal is selected; juego es opcional
  const params = useMemo(
    () =>
      salePointId
        ? {
            salePointId,
            gameId: gameId || undefined,
            sellerId: sellerId || undefined,
            from: from ? `${from}T00:00:00${MANAGUA_OFFSET}` : undefined,
            to: to ? endOfDayParam(to) : undefined,
            drawTime: drawTime || undefined,
          }
        : null,
    [salePointId, gameId, sellerId, from, to, drawTime],
  );

  const { data, isLoading, isFetching, error } = useSalesByNumber(
    params ?? {},
  );

  // Sort by label ascending (backend returns by total_amount DESC)
  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return [...rows].sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }));
  }, [data]);

  const grandTotal = useMemo(
    () => items.reduce((acc, r) => acc + r.totalAmount, 0),
    [items],
  );

  function handleGameChange(id: string) {
    setGameId(id);
    setDrawTime('');
  }

  function handleFromChange(val: string) {
    setFrom(val);
  }

  function handleToChange(val: string) {
    setTo(val);
  }

  const ready = Boolean(salePointId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Sumatoria</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Total vendido por número de apuesta
        </p>
      </header>

      {/* Filtros */}
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Fila 1: Sucursal, Desde, Hasta */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Sucursal" required>
            <Select
              value={salePointId}
              onChange={setSalePointId}
              leadingIcon={<MapPin className="size-4" />}
              placeholder="Selecciona una sucursal"
              options={
                salePoints?.map((sp) => ({ value: sp.id, label: sp.name })) ??
                []
              }
            />
          </Field>
          <Field label="Desde">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => handleFromChange(e.target.value)}
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
                onChange={(e) => handleToChange(e.target.value)}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </Field>
        </div>

        {/* Fila 2: Juego, Sorteo, Vendedor */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Juego">
            <Select
              value={gameId}
              onChange={handleGameChange}
              leadingIcon={<Dices className="size-4" />}
              placeholder="Todos los juegos"
              options={
                games?.map((g) => ({ value: g.id, label: g.name })) ?? []
              }
            />
          </Field>
          <Field label="Sorteo">
            <Select
              value={drawTime}
              onChange={setDrawTime}
              leadingIcon={<Clock className="size-4" />}
              placeholder={gameId ? 'Todos los sorteos' : 'Selecciona un juego primero'}
              options={drawOptions}
              disabled={!gameId}
            />
          </Field>
          <Field label="Vendedor">
            <Select
              value={sellerId}
              onChange={setSellerId}
              leadingIcon={<UserIcon className="size-4" />}
              placeholder={salePointId ? 'Todos los vendedores' : 'Selecciona una sucursal primero'}
              options={sellers.map((u) => ({ value: u.id, label: u.name }))}
              disabled={!salePointId}
            />
          </Field>
        </div>
      </div>

      {/* Estado vacío — esperando selección */}
      {!ready && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <Dices className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Selecciona una sucursal para ver la sumatoria.
          </p>
        </div>
      )}

      {/* Error */}
      {ready && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar los datos: {error.message}
        </div>
      )}

      {/* Badge resumen */}
      {ready && !error && items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-1 max-w-xs">
          <MiniStat label="Facturado" value={grandTotal} tone="emerald" />
        </div>
      )}

      {/* Tabla */}
      {ready && !error && (
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
                  <th className="px-4 py-3">Número de Apuesta</th>
                  <th className="px-4 py-3 text-right">Total Vendido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading && items.length === 0 ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-14 text-center text-sm text-muted-foreground"
                    >
                      Sin ventas en el rango seleccionado.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={`${row.gameId}-${row.label}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {row.label}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">
                        {formatCurrency(row.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-slate-50/70">
                    <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Total ({items.length} número{items.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-base font-black text-emerald-800">
                      {formatCurrency(grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>

            <TableLoadingOverlay show={isFetching && items.length > 0} />
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 2 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'rose';
}) {
  const valueColor = tone === 'emerald' ? 'text-emerald-800' : 'text-rose-800';
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1 text-xl font-black tabular-nums', valueColor)}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
