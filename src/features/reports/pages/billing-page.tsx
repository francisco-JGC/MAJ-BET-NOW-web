import { useMemo, useState } from 'react';
import {
  Calendar,
  Dices,
  MapPin,
  Receipt,
  UserRound,
} from 'lucide-react';

import { useBillingByGame } from '@/features/reports/hooks/use-billing-by-game';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useUsers } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { BillingByGameRow } from '@/features/reports/types';
import { UserRole } from '@/features/users/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PCT_FMT = new Intl.NumberFormat('es-NI', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function BillingPage() {
  const [salePointId, setSalePointId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  const params = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      sellerId: sellerId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
    }),
    [salePointId, sellerId, from, to],
  );

  const { data, isLoading, isFetching, error } = useBillingByGame(params);
  const items = data?.items ?? [];

  const { data: salePoints } = useSalePoints();
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 100,
    offset: 0,
  });

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
          <Receipt className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Facturación por Apuestas
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Desglose por juego · % del total facturado
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sucursal">
            <Select
              value={salePointId}
              onChange={setSalePointId}
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
              onChange={setSellerId}
              leadingIcon={<UserRound className="size-4" />}
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
                <th className="px-6 py-3">Juego</th>
                <th className="px-6 py-3 text-right">Tickets</th>
                <th className="px-6 py-3 text-right">Anulados</th>
                <th className="px-6 py-3 text-right">Facturado</th>
                <th className="px-6 py-3 text-right">Ganado por clientes</th>
                <th className="px-6 py-3 text-right">Neto</th>
                <th className="px-6 py-3 text-right">% del total</th>
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
                    Sin ventas en este rango.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <GameRow key={row.gameId} row={row} />
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50/60 text-sm font-bold">
                <tr>
                  <td className="px-6 py-3.5 text-foreground">Totales</td>
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
                  <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">
                    100.0%
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

function GameRow({ row }: { row: BillingByGameRow }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Dices className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-semibold text-foreground">{row.gameName}</span>
        </div>
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
      <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">
        {PCT_FMT.format(row.share)}
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
