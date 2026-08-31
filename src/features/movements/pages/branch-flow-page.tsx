import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  DoorClosed,
  DoorOpen,
  MapPin,
  Receipt,
  Scale,
  Trophy,
  Wallet,
} from 'lucide-react';

import { useBranchFlow } from '@/features/movements/hooks/use-branch-flow';
import { MovementType } from '@/features/movements/types';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { BranchFlowItem } from '@/features/movements/types';

const MANAGUA = 'America/Managua';
const DATE_TIME_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const DAY_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});
const DAY_KEY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANAGUA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatDateTime(iso: string): string {
  return DATE_TIME_FMT.format(new Date(iso));
}

function formatDay(iso: string): string {
  const s = DAY_FMT.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** yyyy-mm-dd in Managua tz, used as grouping key for daily headers. */
function managuaDayKey(iso: string): string {
  return DAY_KEY_FMT.format(new Date(iso));
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return the numeric signed contribution of an item to running balance. */
function signedAmount(item: BranchFlowItem): number {
  if (item.kind === 'ticket_sale') return item.amount;
  if (item.kind === 'prize_payout') return -item.amount;
  // movement
  switch (item.movementType) {
    case MovementType.DEPOSIT:
      return item.amount;
    case MovementType.EXPENSE:
    case MovementType.WITHDRAWAL:
      return -item.amount;
    default:
      return 0;
  }
}

interface EventMeta {
  label: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'rose' | 'slate' | 'indigo';
}

function metaFor(item: BranchFlowItem): EventMeta {
  if (item.kind === 'ticket_sale') {
    return {
      label: `Venta ${item.folio ?? ''}`,
      icon: <Receipt className="size-4" />,
      tone: 'emerald',
    };
  }
  if (item.kind === 'prize_payout') {
    return {
      label: `Premio ${item.folio ?? ''}`,
      icon: <Trophy className="size-4" />,
      tone: 'rose',
    };
  }
  switch (item.movementType) {
    case MovementType.EXPENSE:
      return {
        label: 'Gasto',
        icon: <ArrowDownRight className="size-4" />,
        tone: 'rose',
      };
    case MovementType.DEPOSIT:
      return {
        label: 'Depósito',
        icon: <ArrowUpRight className="size-4" />,
        tone: 'emerald',
      };
    case MovementType.WITHDRAWAL:
      return {
        label: 'Retiro',
        icon: <Wallet className="size-4" />,
        tone: 'rose',
      };
    case MovementType.OPENING:
      return {
        label: 'Apertura de caja',
        icon: <DoorOpen className="size-4" />,
        tone: 'slate',
      };
    case MovementType.CLOSING:
      return {
        label: 'Cierre de caja',
        icon: <DoorClosed className="size-4" />,
        tone: 'slate',
      };
    case MovementType.ADJUSTMENT:
      return {
        label: 'Ajuste',
        icon: <Scale className="size-4" />,
        tone: 'slate',
      };
    default:
      return {
        label: 'Movimiento',
        icon: <Activity className="size-4" />,
        tone: 'slate',
      };
  }
}

const TONE_CLASSES = {
  emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  rose: 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
  slate: 'bg-slate-500/10 text-slate-700 ring-slate-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20',
} as const;

export function BranchFlowPage() {
  const [salePointId, setSalePointId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));

  const params = useMemo(
    () =>
      salePointId
        ? {
            salePointId,
            from: from ? `${from}T00:00:00-06:00` : undefined,
            to: to ? `${to}T23:59:59-06:00` : undefined,
          }
        : null,
    [salePointId, from, to],
  );

  const { data, isLoading, isFetching, error } = useBranchFlow(params);
  const items = data?.items ?? [];

  const { data: salePoints } = useSalePoints();

  // Compute running balance + group by Managua day. Balance resets at the
  // start of the query range (we don't have "opening balance from before").
  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      { day: string; rows: Array<{ item: BranchFlowItem; balance: number }> }
    >();
    let balance = 0;
    for (const item of items) {
      balance += signedAmount(item);
      const key = managuaDayKey(item.at);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.rows.push({ item, balance });
      } else {
        groups.set(key, { day: item.at, rows: [{ item, balance }] });
      }
    }
    return Array.from(groups.values());
  }, [items]);

  const totals = useMemo(() => {
    let sales = 0;
    let prizes = 0;
    let expenses = 0;
    let deposits = 0;
    let withdrawals = 0;
    for (const it of items) {
      if (it.kind === 'ticket_sale') sales += it.amount;
      else if (it.kind === 'prize_payout') prizes += it.amount;
      else if (it.movementType === MovementType.EXPENSE) expenses += it.amount;
      else if (it.movementType === MovementType.DEPOSIT) deposits += it.amount;
      else if (it.movementType === MovementType.WITHDRAWAL)
        withdrawals += it.amount;
    }
    const net = sales - prizes + deposits - withdrawals - expenses;
    return { sales, prizes, expenses, deposits, withdrawals, net };
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Flujo de Sucursal
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Cronología de eventos con balance corriente
        </p>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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

      {!salePointId && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <MapPin className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Selecciona una sucursal para ver su flujo cronológico.
          </p>
        </div>
      )}

      {salePointId && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar el flujo: {error.message}
        </div>
      )}

      {salePointId && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MiniStat label="Ventas" value={totals.sales} tone="emerald" />
            <MiniStat label="Premios" value={totals.prizes} tone="rose" />
            <MiniStat label="Depósitos" value={totals.deposits} tone="emerald" />
            <MiniStat label="Gastos + Retiros" value={totals.expenses + totals.withdrawals} tone="rose" />
            <MiniStat
              label="Neto"
              value={totals.net}
              tone={totals.net >= 0 ? 'indigo' : 'rose'}
            />
          </div>

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
                    <th className="px-6 py-3">Fecha / hora</th>
                    <th className="px-6 py-3">Evento</th>
                    <th className="px-6 py-3">Descripción</th>
                    <th className="px-6 py-3 text-right">Monto</th>
                    <th className="px-6 py-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading && items.length === 0 ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-14 text-center text-sm text-muted-foreground"
                      >
                        Sin eventos en este rango.
                      </td>
                    </tr>
                  ) : (
                    grouped.map((group) => (
                      <DayGroup
                        key={managuaDayKey(group.day)}
                        day={group.day}
                        rows={group.rows}
                      />
                    ))
                  )}
                </tbody>
              </table>

              <TableLoadingOverlay show={isFetching && items.length > 0} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DayGroup({
  day,
  rows,
}: {
  day: string;
  rows: Array<{ item: BranchFlowItem; balance: number }>;
}) {
  return (
    <>
      <tr className="bg-slate-50/60">
        <td
          colSpan={5}
          className="px-6 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {formatDay(day)}
        </td>
      </tr>
      {rows.map(({ item, balance }) => (
        <FlowRow key={item.refId + item.kind} item={item} balance={balance} />
      ))}
    </>
  );
}

function FlowRow({
  item,
  balance,
}: {
  item: BranchFlowItem;
  balance: number;
}) {
  const meta = metaFor(item);
  const signed = signedAmount(item);
  const amountColor =
    signed > 0
      ? 'text-emerald-700'
      : signed < 0
        ? 'text-rose-700'
        : 'text-foreground';
  const sign = signed > 0 ? '+' : signed < 0 ? '−' : '';
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-3.5 text-muted-foreground tabular-nums">
        {formatDateTime(item.at)}
      </td>
      <td className="px-6 py-3.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
            TONE_CLASSES[meta.tone],
          )}
        >
          {meta.icon}
          {meta.label}
        </span>
      </td>
      <td className="max-w-md truncate px-6 py-3.5 text-muted-foreground">
        {item.description || (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td
        className={cn(
          'px-6 py-3.5 text-right tabular-nums font-semibold',
          amountColor,
        )}
      >
        {sign}
        {formatCurrency(item.amount)}
      </td>
      <td
        className={cn(
          'px-6 py-3.5 text-right tabular-nums font-bold',
          balance >= 0 ? 'text-indigo-700' : 'text-rose-700',
        )}
      >
        {formatCurrency(balance)}
      </td>
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
  tone: 'emerald' | 'rose' | 'indigo';
}) {
  const valueColor = {
    emerald: 'text-emerald-800',
    rose: 'text-rose-800',
    indigo: 'text-indigo-800',
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1 text-lg font-black tabular-nums', valueColor)}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
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
