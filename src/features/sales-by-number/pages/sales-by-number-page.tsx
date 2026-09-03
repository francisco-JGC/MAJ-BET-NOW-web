import { useMemo, useState } from 'react';
import {
  Calendar,
  Dices,
  Hash,
  MapPin,
  UserRound,
} from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useSalesByNumber } from '@/features/sales-by-number/hooks/use-sales-by-number';
import { useUsers } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { SalesByNumberRow } from '@/features/sales-by-number/types';
import { UserRole } from '@/features/users/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SalesByNumberPage() {
  const [salePointId, setSalePointId] = useState('');
  const [gameId, setGameId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  // Managua = UTC-6 fijo. Mando ISO con offset explícito para que el
  // backend interprete correctamente los límites del día sin depender
  // de la TZ del cliente.
  const params = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      gameId: gameId || undefined,
      sellerId: sellerId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? endOfDayParam(to) : undefined,
    }),
    [salePointId, gameId, sellerId, from, to],
  );

  const { data, isLoading, isFetching, error } = useSalesByNumber(params);
  const items = data?.items ?? [];

  // Dropdowns. `useSalePoints` ya devuelve solo las visibles al partner
  // logueado (el backend aplica scope). `useUsers` sin filtrar por rol
  // devolvería todos; forzamos SELLER para el filtro.
  const { data: salePoints } = useSalePoints();
  const { data: games } = useGames();
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 200,
    offset: 0,
  });

  // Cuando el usuario elige una sucursal, filtramos los vendedores del
  // dropdown localmente para que solo aparezcan los de esa sucursal —
  // el backend también aplica el filtro, pero mostrar 0 opciones cuando
  // se elige una sucursal sin vendedores da mejor UX que un dropdown
  // ambiguo con vendedores de otras sucursales.
  const sellerOptions = useMemo(() => {
    const all = sellersPage?.items ?? [];
    const filtered = salePointId
      ? all.filter((u) => u.salePointId === salePointId)
      : all;
    return [
      { value: '', label: 'Todos los vendedores' },
      ...filtered.map((u) => ({ value: u.id, label: u.name })),
    ];
  }, [sellersPage, salePointId]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let ticketCount = 0;
    for (const r of items) {
      totalAmount += r.totalAmount;
      ticketCount += r.ticketCount;
    }
    return { totalAmount, ticketCount };
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Hash className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Ventas por Número
          </h1>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Cuántas veces se vendió cada número y monto total apostado, según
          los filtros. Solo tickets válidos (los anulados no cuentan).
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Sucursal">
            <Select
              value={salePointId}
              onChange={(v) => {
                setSalePointId(v);
                // Al cambiar de sucursal reseteamos vendedor porque las
                // opciones cambian según la sucursal.
                setSellerId('');
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
          <Field label="Juego">
            <Select
              value={gameId}
              onChange={setGameId}
              leadingIcon={<Dices className="size-4" />}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos los juegos' },
                ...(games?.map((g) => ({
                  value: g.id,
                  label: g.name,
                })) ?? []),
              ]}
            />
          </Field>
          <Field label="Vendedor">
            <Select
              value={sellerId}
              onChange={setSellerId}
              leadingIcon={<UserRound className="size-4" />}
              placeholder="Todos"
              options={sellerOptions}
            />
          </Field>
          <Field label="Desde">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
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
                onChange={(e) => setTo(e.target.value)}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </Field>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar el reporte: {error.message}
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
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Juego</th>
                <th className="px-6 py-3 text-right">Veces vendido</th>
                <th className="px-6 py-3 text-right">Monto total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && items.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    Sin ventas en este rango con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <NumberRow
                    key={`${row.gameId}::${row.label}`}
                    row={row}
                  />
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50/60 text-sm font-bold">
                <tr>
                  <td className="px-6 py-3.5 text-foreground" colSpan={2}>
                    Totales ({items.length} números)
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums">
                    {totals.ticketCount}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums text-emerald-700">
                    {formatCurrency(totals.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          <TableLoadingOverlay show={isFetching && items.length > 0} />
        </div>
      </div>
    </div>
  );
}

function NumberRow({ row }: { row: SalesByNumberRow }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5">
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-foreground">
          {row.label}
        </span>
      </td>
      <td className="px-6 py-3.5 text-muted-foreground">{row.gameName}</td>
      <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-foreground">
        {row.ticketCount}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums font-bold text-emerald-700">
        {formatCurrency(row.totalAmount)}
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 4 }).map((_, i) => (
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
