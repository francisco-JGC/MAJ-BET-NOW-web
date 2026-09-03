import { useMemo, useState } from 'react';
import {
  Calendar,
  Dices,
  Handshake,
  MapPin,
  Store,
} from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import { useBranchTotals } from '@/features/reports/hooks/use-branch-totals';
import { cn } from '@/shared/lib/cn';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { BranchTotalsRow } from '@/features/reports/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BranchTotalsPage() {
  const [gameId, setGameId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  const params = useMemo(
    () => ({
      gameId: gameId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? endOfDayParam(to) : undefined,
    }),
    [gameId, from, to],
  );

  const { data, isLoading, isFetching, error } = useBranchTotals(params);
  const items = data?.items ?? [];

  const { data: games } = useGames();

  const totals = useMemo(() => {
    let billed = 0;
    let wonPrize = 0;
    let net = 0;
    let ticketCount = 0;
    for (const r of items) {
      billed += r.billed;
      wonPrize += r.wonPrize;
      net += r.net;
      ticketCount += r.ticketCount;
    }
    return { billed, wonPrize, net, ticketCount };
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Totales por Sucursal
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Neto = <span className="font-semibold text-foreground">facturado − premios ganados</span>
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Juego">
            <Select
              value={gameId}
              onChange={setGameId}
              leadingIcon={<Dices className="size-4" />}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos los juegos' },
                ...(games?.map((g) => ({ value: g.id, label: g.name })) ?? []),
              ]}
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
                <th className="px-6 py-3">Sucursal</th>
                <th className="px-6 py-3">Socio</th>
                <th className="px-6 py-3 text-right">Tickets</th>
                <th className="px-6 py-3 text-right">Anulados</th>
                <th className="px-6 py-3 text-right">Facturado</th>
                <th className="px-6 py-3 text-right">Ganado por clientes</th>
                <th className="px-6 py-3 text-right">Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && items.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    Sin ventas en este rango.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <BranchRow key={row.salePointId} row={row} />
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50/60 text-sm font-bold">
                <tr>
                  <td className="px-6 py-3.5 text-foreground" colSpan={2}>
                    Totales
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums">
                    {totals.ticketCount}
                  </td>
                  <td className="px-6 py-3.5" />
                  <td className="px-6 py-3.5 text-right tabular-nums text-emerald-700">
                    {formatCurrency(totals.billed)}
                  </td>
                  <td className="px-6 py-3.5 text-right tabular-nums text-rose-700">
                    {formatCurrency(totals.wonPrize)}
                  </td>
                  <td
                    className={cn(
                      'px-6 py-3.5 text-right tabular-nums',
                      totals.net >= 0 ? 'text-indigo-700' : 'text-rose-700',
                    )}
                  >
                    {formatCurrency(totals.net)}
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

function BranchRow({ row }: { row: BranchTotalsRow }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-black text-white">
            <MapPin className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-semibold text-foreground">
            {row.salePointName}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5">
        {row.ownerPartnerName ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Handshake className="size-3.5 text-indigo-600" />
            {row.ownerPartnerName}
          </span>
        ) : (
          <Empty />
        )}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums text-foreground">
        {row.ticketCount}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">
        {row.voidedCount || <Empty />}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-emerald-700">
        {formatCurrency(row.billed)}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums text-rose-700">
        {row.wonPrize > 0 ? formatCurrency(row.wonPrize) : <Empty />}
      </td>
      <td
        className={cn(
          'px-6 py-3.5 text-right tabular-nums font-bold',
          row.net >= 0 ? 'text-indigo-700' : 'text-rose-700',
        )}
      >
        {formatCurrency(row.net)}
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

function Empty() {
  return <span className="text-muted-foreground/50">—</span>;
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
