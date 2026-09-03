import { useMemo, useState } from 'react';
import {
  Calendar,
  ChartBar,
  MapPin,
  UserRound,
} from 'lucide-react';

import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useSellerReport } from '@/features/reports/hooks/use-seller-report';
import { useUsers } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { SellerReportRow } from '@/features/reports/types';
import { UserRole } from '@/features/users/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function SellerReportPage() {
  const [salePointId, setSalePointId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  const params = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      sellerId: sellerId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? endOfDayParam(to) : undefined,
    }),
    [salePointId, sellerId, from, to],
  );

  const { data, isLoading, isFetching, error } = useSellerReport(params);
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
    let salary = 0;
    let ticketCount = 0;
    for (const r of items) {
      billed += r.billed;
      wonPrize += r.wonPrize;
      salary += r.salary ?? 0;
      ticketCount += r.ticketCount;
    }
    return { billed, wonPrize, salary, ticketCount };
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChartBar className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Reporte Diario del Vendedor
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Comisión = <span className="font-semibold text-foreground">facturado × %pago / 100</span>
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
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3 text-right">Tickets</th>
                <th className="px-6 py-3 text-right">Anulados</th>
                <th className="px-6 py-3 text-right">Facturado</th>
                <th className="px-6 py-3 text-right">Ganado por clientes</th>
                <th className="px-6 py-3 text-right">% Pago</th>
                <th className="px-6 py-3 text-right">Comisión</th>
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
                items.map((row) => <SellerRow key={row.sellerId} row={row} />)
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
                  <td className="px-6 py-3.5" />
                  <td className="px-6 py-3.5 text-right tabular-nums text-indigo-700">
                    {formatCurrency(totals.salary)}
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

function SellerRow({ row }: { row: SellerReportRow }) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white">
            {row.sellerName.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-semibold text-foreground">{row.sellerName}</span>
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
      <td className="px-6 py-3.5 text-right tabular-nums">
        {row.paymentPercentage !== null ? (
          <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            {row.paymentPercentage}%
          </span>
        ) : (
          <Empty />
        )}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums font-bold text-indigo-700">
        {row.salary !== null ? formatCurrency(row.salary) : <Empty />}
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
