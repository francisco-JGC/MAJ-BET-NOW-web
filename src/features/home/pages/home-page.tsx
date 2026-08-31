import { useMemo, useState } from 'react';
import {
  Calendar,
  CircleDollarSign,
  MapPin,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
} from 'lucide-react';

import { GamesBreakdown } from '@/features/home/components/games-breakdown';
import {
  KpiCard,
  type KpiDelta,
} from '@/features/home/components/kpi-card';
import { RecentWinnersCard } from '@/features/home/components/recent-winners-card';
import { TopRankingCard } from '@/features/home/components/top-ranking-card';
import { useDashboardSummary } from '@/features/home/hooks/use-dashboard-summary';
import { useSession } from '@/features/auth/hooks/use-session';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function isToday(a: string): boolean {
  return a === isoDate(new Date());
}

export function HomePage() {
  const session = useSession();

  const todayIso = isoDate(new Date());
  const [from, setFrom] = useState<string>(todayIso);
  const [to, setTo] = useState<string>(todayIso);

  const params = useMemo(
    () => ({
      // Managua = UTC-6 fijo. Enviamos ISO con offset explícito para
      // que el backend interprete correctamente los límites del día
      // sin depender de la TZ del cliente.
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
    }),
    [from, to],
  );

  const { data, isLoading, error } = useDashboardSummary(params);

  // Etiquetas y hints: si el rango es "hoy", mostramos "hoy"; si es
  // un rango custom, mostramos el rango. Sub-hint de deltas también
  // se adapta ("vs ayer" vs "vs período previo").
  const isOnlyToday = isSameDay(from, to) && isToday(from);
  const isSingleDay = isSameDay(from, to);
  const suffix = isOnlyToday
    ? 'hoy'
    : isSingleDay
      ? `del ${formatShortDate(from)}`
      : `del ${formatShortDate(from)} al ${formatShortDate(to)}`;
  const deltaHint = isOnlyToday ? 'vs ayer' : 'vs período previo';

  return (
    <div className="space-y-6">
      <PageHeader name={session?.user.name ?? ''} />

      <RangeFilter
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onResetToday={() => {
          setFrom(todayIso);
          setTo(todayIso);
        }}
      />

      {isLoading && <HomeSkeleton />}
      {error && <HomeError message={error.message} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              label={`Facturado ${suffix}`}
              value={formatCurrency(data.billed)}
              icon={CircleDollarSign}
              tone="emerald"
              hint={deltaHint}
              delta={pctDelta(data.billed, data.billedPrev, 'up')}
            />
            <KpiCard
              label={`Pérdida ${suffix}`}
              value={formatCurrency(data.won)}
              icon={TrendingDown}
              tone="rose"
              hint="Premios ganados en el rango"
              delta={pctDelta(data.won, data.wonPrev, 'down')}
            />
            <KpiCard
              label={`Utilidad ${suffix}`}
              value={formatCurrency(data.profit)}
              icon={TrendingUp}
              tone="indigo"
              hint="Facturado − Pérdida"
              delta={pctDelta(data.profit, data.profitPrev, 'up')}
            />
            <KpiCard
              label={`Boletos ${suffix}`}
              value={data.tickets.toLocaleString('es')}
              icon={Receipt}
              tone="amber"
              hint={`Ticket promedio ${formatCurrency(data.averageTicket)}`}
              delta={pctDelta(data.tickets, data.ticketsPrev, 'up')}
            />
            <KpiCard
              label="Venta semanal"
              value={formatCurrency(data.weeklyBilled)}
              icon={Sparkles}
              tone="emerald"
              hint="Lunes a hoy vs misma semana pasada"
              delta={pctDelta(
                data.weeklyBilled,
                data.weeklyBilledPrev,
                'up',
              )}
            />
          </div>

          <GamesBreakdown items={data.byGame} />

          <div className="grid gap-6 lg:grid-cols-2">
            <TopRankingCard
              title={`Top vendedores (${suffix})`}
              emptyLabel="Aún no hay ventas en el rango."
              items={data.topSellers}
              icon={UserRound}
              tone="indigo"
            />
            <TopRankingCard
              title={`Top puntos de venta (${suffix})`}
              emptyLabel="Aún no hay ventas en el rango."
              items={data.topSalePoints}
              icon={MapPin}
              tone="emerald"
            />
          </div>

          <RecentWinnersCard data={data.recentWinners} />
        </>
      )}
    </div>
  );
}

function pctDelta(
  current: number,
  baseline: number,
  positive: 'up' | 'down',
): KpiDelta {
  if (baseline === 0) {
    // No baseline to compare against: hide the arrow, show "sin dato".
    return { pct: null, positive };
  }
  const pct = ((current - baseline) / Math.abs(baseline)) * 100;
  return { pct, positive };
}

function PageHeader({ name }: { name: string }) {
  const today = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const first = name.split(' ')[0];
  const capitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Hola{first ? `, ${first}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{capitalized}</p>
      </div>
    </header>
  );
}

function RangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  onResetToday,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onResetToday: () => void;
}) {
  const showReset = !isToday(from) || !isToday(to);
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <Field label="Desde">
        <DateField value={from} max={to} onChange={onFromChange} />
      </Field>
      <Field label="Hasta">
        <DateField value={to} min={from} onChange={onToChange} />
      </Field>
      {showReset && (
        <button
          type="button"
          onClick={onResetToday}
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          Hoy
        </button>
      )}
    </div>
  );
}

function DateField({
  value,
  min,
  max,
  onChange,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-44 rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
        )}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/** "05/03" — corta para labels de KPI. */
function formatShortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border/70 bg-card"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl border border-border/70 bg-card" />
    </div>
  );
}

function HomeError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
      No se pudieron cargar los datos del dashboard: {message}
    </div>
  );
}
