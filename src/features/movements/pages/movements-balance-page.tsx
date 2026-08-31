import { useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Calendar,
  Handshake,
  MapPin,
  Share2,
  Sigma,
  TrendingDown,
  TrendingUp,
  User,
  UserSearch,
} from 'lucide-react';
import { toast } from 'sonner';

import { useMovementsBalance } from '@/features/movements/hooks/use-movements-balance';
import { useSellerReport } from '@/features/reports/hooks/use-seller-report';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { shareCardImage } from '@/shared/lib/share-whatsapp';
import { MultiSelect } from '@/shared/ui/multi-select';
import { Select } from '@/shared/ui/select';

import type { MovementsBalanceRow } from '@/features/movements/types';
import type { SellerReportRow } from '@/features/reports/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Cálculo de movimientos rediseñado a **cards**. Dos modos:
 *
 * - **Sin vendedor seleccionado** → un card por sucursal con billed,
 *   premios ganados por clientes (wonPrize, evaluado contra los sorteos
 *   que ya cayeron), movements, el salario del encargado según % configurado
 *   en la sucursal, y el `net` grande resaltado en verde/rojo.
 * - **Con vendedor seleccionado** → un card por vendedor con lo que
 *   vendió, premios ganados por sus clientes (wonPrize), su salario según %
 *   (con checkbox para ocultar), y el net del vendedor.
 *
 * En móvil los cards hacen scroll horizontal (flex-nowrap + overflow-x)
 * para revisar sucursal por sucursal sin abrir una vista distinta.
 */
export function MovementsBalancePage() {
  // Multi-sucursal. `[]` significa "todas las visibles según partner scope".
  const [salePointIds, setSalePointIds] = useState<string[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [showSalary, setShowSalary] = useState(true);

  const rangeParams = useMemo(
    () => ({
      salePointIds: salePointIds.length > 0 ? salePointIds : undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
    }),
    [salePointIds, from, to],
  );

  const balanceQuery = useMovementsBalance(rangeParams);
  // No pasamos `sellerId` a la query — traemos TODOS los vendedores en
  // scope (respetando sucursal + partner scope + rango) y filtramos
  // localmente. Con esto el dropdown se puebla con la misma fuente,
  // evitando el bug donde `useUsers` con partner scoping (por
  // `createdById`) devolvía lista vacía si los sellers fueron creados
  // por un admin y no por el partner logueado.
  const sellerQuery = useSellerReport(rangeParams);

  const { data: salePoints } = useSalePoints();

  const balanceRows = balanceQuery.data?.items ?? [];
  const allSellerRows = sellerQuery.data?.items ?? [];
  const sellerRows = sellerId
    ? allSellerRows.filter((s) => s.sellerId === sellerId)
    : allSellerRows;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calculator className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Cálculo de Movimientos
          </h1>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          El <span className="font-semibold">restante</span> descuenta los
          premios de boletos ganadores en el rango, según los sorteos que ya
          cayeron. Los boletos con sorteos pendientes no cuentan.
        </p>
      </header>

      <FiltersBar
        salePointIds={salePointIds}
        onSalePointIdsChange={setSalePointIds}
        salePoints={salePoints ?? []}
        sellerId={sellerId}
        onSellerChange={setSellerId}
        sellers={allSellerRows.map((r) => ({
          id: r.sellerId,
          name: r.sellerName,
        }))}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        showSalary={showSalary}
        onShowSalaryChange={setShowSalary}
      />

      <section className="space-y-3">
        <SectionHeader
          icon={<User className="size-4" />}
          title="Vendedores"
          hint={
            sellerId
              ? '1 vendedor filtrado'
              : `${sellerRows.length} vendedor${sellerRows.length === 1 ? '' : 'es'}`
          }
        />
        {sellerQuery.error ? (
          <ErrorBox message={sellerQuery.error.message} />
        ) : (
          <SellerCards
            rows={sellerRows}
            loading={sellerQuery.isLoading}
            showSalary={showSalary}
          />
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader
          icon={<MapPin className="size-4" />}
          title="Sucursales"
          hint={
            salePointIds.length > 0
              ? `${salePointIds.length} sucursal${salePointIds.length === 1 ? '' : 'es'} filtrada${salePointIds.length === 1 ? '' : 's'}`
              : `${balanceRows.length} sucursal${balanceRows.length === 1 ? '' : 'es'}`
          }
        />
        {balanceQuery.error ? (
          <ErrorBox message={balanceQuery.error.message} />
        ) : (
          <BranchCards
            rows={balanceRows}
            loading={balanceQuery.isLoading}
            showSalary={showSalary}
          />
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
        {title}
      </h2>
      <span className="text-[11px] text-muted-foreground">· {hint}</span>
    </div>
  );
}

function FiltersBar({
  salePointIds,
  onSalePointIdsChange,
  salePoints,
  sellerId,
  onSellerChange,
  sellers,
  from,
  onFromChange,
  to,
  onToChange,
  showSalary,
  onShowSalaryChange,
}: {
  salePointIds: string[];
  onSalePointIdsChange: (v: string[]) => void;
  salePoints: { id: string; name: string }[];
  sellerId: string;
  onSellerChange: (v: string) => void;
  sellers: { id: string; name: string }[];
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
  showSalary: boolean;
  onShowSalaryChange: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Sucursales">
          <MultiSelect
            values={salePointIds}
            onChange={onSalePointIdsChange}
            leadingIcon={<MapPin className="size-4" />}
            placeholder="Todas las sucursales"
            itemLabel="sucursales"
            options={salePoints.map((sp) => ({
              value: sp.id,
              label: sp.name,
            }))}
          />
        </Field>
        <Field label="Vendedor">
          <Select
            value={sellerId}
            onChange={onSellerChange}
            leadingIcon={<UserSearch className="size-4" />}
            placeholder="Todos"
            options={[
              { value: '', label: 'Todos los vendedores' },
              ...sellers.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </Field>
        <Field label="Desde">
          <DateField value={from} max={to} onChange={onFromChange} />
        </Field>
        <Field label="Hasta">
          <DateField value={to} min={from} onChange={onToChange} />
        </Field>
      </div>
      <label className="flex items-center gap-2 pt-1 text-sm text-foreground">
        <input
          type="checkbox"
          checked={showSalary}
          onChange={(e) => onShowSalaryChange(e.target.checked)}
          className="size-4 rounded border-border"
        />
        Mostrar salarios (vendedor y encargado)
      </label>
    </div>
  );
}

/**
 * Contenedor de cards responsivo:
 * - Móvil (< sm): flex row con overflow-x, cada card con min-width fijo.
 * - Desktop: grid de 2/3/4 columnas según tamaño de viewport.
 */
function CardsScroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 sm:mx-0">
      <div
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:pb-0',
          'sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:px-0',
          'lg:grid-cols-3 xl:grid-cols-4',
        )}
      >
        {children}
      </div>
    </div>
  );
}

function BranchCards({
  rows,
  loading,
  showSalary,
}: {
  rows: MovementsBalanceRow[];
  loading: boolean;
  showSalary: boolean;
}) {
  if (loading && rows.length === 0) {
    return (
      <CardsScroller>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </CardsScroller>
    );
  }
  if (rows.length === 0) {
    return <EmptyBox message="Sin movimientos ni ventas en este rango." />;
  }
  return (
    <CardsScroller>
      {/* Sumatoria general — SIEMPRE primera. Refleja los mismos stats
          que un BranchCard, pero sumando todas las sucursales visibles
          en el rango. */}
      <BranchSummaryCard rows={rows} showSalary={showSalary} />
      {rows.map((row) => (
        <BranchCard key={row.salePointId} row={row} showSalary={showSalary} />
      ))}
    </CardsScroller>
  );
}

function BranchSummaryCard({
  rows,
  showSalary,
}: {
  rows: MovementsBalanceRow[];
  showSalary: boolean;
}) {
  const totals = useMemo(() => {
    let billed = 0;
    let wonPrize = 0;
    let deposits = 0;
    let withdrawals = 0;
    let expenses = 0;
    let partnerSalary = 0;
    let net = 0;
    for (const r of rows) {
      billed += r.billed;
      wonPrize += r.wonPrize;
      deposits += r.deposits;
      withdrawals += r.withdrawals;
      expenses += r.expenses;
      partnerSalary += r.partnerSalary ?? 0;
      net += r.net;
    }
    return {
      billed,
      wonPrize,
      deposits,
      withdrawals,
      expenses,
      partnerSalary,
      net,
    };
  }, [rows]);

  // Con el toggle "Salarios" apagado, el vendedor quiere ver el restante
  // SIN descontar salarios de encargado. El backend siempre los descuenta
  // en `row.net`, así que sumamos de vuelta cuando el toggle está en OFF.
  const effectiveNet = showSalary ? totals.net : totals.net + totals.partnerSalary;
  const isPositive = effectiveNet >= 0;

  return (
    <article
      className={cn(
        'flex min-w-[280px] flex-none snap-start flex-col rounded-2xl border-2 bg-gradient-to-br from-indigo-50/60 to-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:min-w-0 sm:flex-auto',
        isPositive ? 'border-indigo-300/70' : 'border-rose-300/70',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
              <Sigma className="size-4" strokeWidth={2.4} />
            </span>
            <h3 className="truncate text-sm font-bold text-foreground">
              Sumatoria general
            </h3>
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
            {rows.length} sucursal{rows.length === 1 ? '' : 'es'}
          </div>
        </div>
      </header>

      <NetBanner value={effectiveNet} />

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Stat label="Facturado" value={totals.billed} tone="emerald" />
        <Stat
          label="Premios ganados"
          value={totals.wonPrize}
          tone="rose"
        />
        <Stat label="Depósitos" value={totals.deposits} tone="emerald" />
        <Stat label="Retiros" value={totals.withdrawals} tone="rose" />
        <Stat
          label="Gastos"
          value={totals.expenses}
          tone="rose"
          className={showSalary ? undefined : 'col-span-2'}
        />
        {showSalary && (
          <Stat
            label="Salarios encargados"
            value={totals.partnerSalary}
            tone="indigo"
          />
        )}
      </dl>
    </article>
  );
}

function BranchCard({
  row,
  showSalary,
}: {
  row: MovementsBalanceRow;
  showSalary: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  // Con "Salarios" apagado, no descontamos el salario del encargado en el
  // restante — el backend siempre lo mete en `row.net`, así que sumamos
  // de vuelta cuando el toggle está en OFF.
  const effectiveNet = showSalary
    ? row.net
    : row.net + (row.partnerSalary ?? 0);
  const isPositive = effectiveNet >= 0;
  // Sólo mostramos salario del encargado si hay % configurado en la
  // sucursal — sin % no cobra (mismo criterio que el SellerCard).
  const showManagerSalary =
    showSalary && row.partnerPaymentPercentage !== null;
  return (
    <article
      ref={cardRef}
      className={cn(
        'flex min-w-[280px] flex-none snap-start flex-col rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:min-w-0 sm:flex-auto',
        isPositive ? 'border-emerald-200/60' : 'border-rose-200/60',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <MapPin className="size-4" strokeWidth={2.4} />
            </span>
            <h3 className="truncate text-sm font-bold text-foreground">
              {row.salePointName}
            </h3>
          </div>
          {row.ownerPartnerName && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Handshake className="size-3 text-indigo-600" />
              {row.ownerPartnerName}
            </div>
          )}
        </div>
        <ShareButton
          getElement={() => cardRef.current}
          phone={row.ownerPartnerPhone}
          disabledReason={
            !row.ownerPartnerId
              ? 'Sin encargado asignado'
              : !row.ownerPartnerPhone
                ? 'Encargado sin teléfono'
                : null
          }
          fileName={`sucursal-${row.salePointName.replace(/\s+/g, '-').toLowerCase()}.png`}
          message={`Reporte de ${row.salePointName} — Restante: ${formatCurrency(effectiveNet)}.`}
        />
      </header>

      <NetBanner value={effectiveNet} />

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Stat label="Facturado" value={row.billed} tone="emerald" />
        <Stat
          label="Premios ganados"
          value={row.wonPrize}
          tone="rose"
        />
        <Stat label="Depósitos" value={row.deposits} tone="emerald" />
        <Stat label="Retiros" value={row.withdrawals} tone="rose" />
        <Stat
          label="Gastos"
          value={row.expenses}
          tone="rose"
          className={showManagerSalary ? undefined : 'col-span-2'}
        />
        {showManagerSalary && (
          <Stat
            label={`Salario encargado (${row.partnerPaymentPercentage}%)`}
            value={row.partnerSalary ?? 0}
            tone="indigo"
            hint={
              row.ownerPartnerName
                ? `Para ${row.ownerPartnerName}`
                : 'Sin encargado asignado'
            }
          />
        )}
      </dl>
    </article>
  );
}

function SellerCards({
  rows,
  loading,
  showSalary,
}: {
  rows: SellerReportRow[];
  loading: boolean;
  showSalary: boolean;
}) {
  if (loading && rows.length === 0) {
    return (
      <CardsScroller>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </CardsScroller>
    );
  }
  if (rows.length === 0) {
    return <EmptyBox message="Sin ventas del vendedor en este rango." />;
  }
  return (
    <CardsScroller>
      {rows.map((row) => (
        <SellerCard key={row.sellerId} row={row} showSalary={showSalary} />
      ))}
    </CardsScroller>
  );
}

function SellerCard({
  row,
  showSalary,
}: {
  row: SellerReportRow;
  showSalary: boolean;
}) {
  const cardRef = useRef<HTMLElement>(null);
  // Ganancia neta del vendedor = ventas − premios que debería entregar
  // − su propio salario (comisión). Movimientos (depósitos/retiros/gastos)
  // no entran porque son a nivel sucursal, no del vendedor.
  //
  // Con el toggle "Salarios" apagado, tampoco se descuenta el salario del
  // vendedor — el vendedor quiere ver el neto sin ese costo.
  const net =
    row.billed - row.wonPrize - (showSalary ? row.salary ?? 0 : 0);
  const isPositive = net >= 0;
  return (
    <article
      ref={cardRef}
      className={cn(
        'flex min-w-[280px] flex-none snap-start flex-col rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:min-w-0 sm:flex-auto',
        isPositive ? 'border-emerald-200/60' : 'border-rose-200/60',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
              <User className="size-4" strokeWidth={2.4} />
            </span>
            <h3 className="truncate text-sm font-bold text-foreground">
              {row.sellerName}
            </h3>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {row.ticketCount} ticket{row.ticketCount === 1 ? '' : 's'}
            {row.voidedCount > 0 && ` · ${row.voidedCount} anulado(s)`}
          </div>
        </div>
        <ShareButton
          getElement={() => cardRef.current}
          phone={row.sellerPhone}
          disabledReason={
            !row.sellerPhone ? 'Vendedor sin teléfono' : null
          }
          fileName={`vendedor-${row.sellerName.replace(/\s+/g, '-').toLowerCase()}.png`}
          message={`Reporte de ${row.sellerName} — Vendido: ${formatCurrency(row.billed)}.`}
        />
      </header>

      <NetBanner value={net} />

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Stat label="Vendido" value={row.billed} tone="emerald" />
        <Stat
          label="Premios ganados"
          value={row.wonPrize}
          tone="rose"
          className={showSalary ? undefined : 'col-span-2'}
        />
        {showSalary && (
          <Stat
            label={
              row.paymentPercentage !== null
                ? `Salario (${row.paymentPercentage}%)`
                : 'Salario'
            }
            value={row.salary ?? 0}
            tone="indigo"
            hint={
              row.paymentPercentage === null
                ? 'Sin % configurado'
                : undefined
            }
          />
        )}
      </dl>
    </article>
  );
}

function NetBanner({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 ring-inset',
        isPositive
          ? 'bg-emerald-50 ring-emerald-500/25'
          : 'bg-rose-50 ring-rose-500/25',
      )}
    >
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="size-4 text-emerald-700" strokeWidth={2.4} />
        ) : (
          <TrendingDown className="size-4 text-rose-700" strokeWidth={2.4} />
        )}
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            isPositive ? 'text-emerald-700' : 'text-rose-700',
          )}
        >
          Restante
        </span>
      </div>
      <span
        className={cn(
          'text-xl font-black tabular-nums',
          isPositive ? 'text-emerald-800' : 'text-rose-800',
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
  className,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'rose' | 'indigo' | 'neutral';
  hint?: string;
  className?: string;
}) {
  const toneClass = {
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    indigo: 'text-indigo-700',
    neutral: 'text-foreground',
  }[tone];
  const Icon =
    tone === 'emerald'
      ? ArrowUpRight
      : tone === 'rose'
        ? ArrowDownRight
        : null;
  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-background/60 p-2.5',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {Icon && (
          <Icon className={cn('size-3', toneClass)} strokeWidth={2.4} />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className={cn('mt-0.5 text-base font-bold tabular-nums', toneClass)}>
        {formatCurrency(value)}
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-muted-foreground/80">
          {hint}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="min-w-[280px] flex-none animate-pulse rounded-2xl border border-border bg-card p-4 sm:min-w-0 sm:flex-auto">
      <div className="h-6 w-2/3 rounded bg-muted" />
      <div className="mt-4 h-12 rounded-xl bg-muted" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      No se pudo cargar el reporte: {message}
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
        className={cn(inputClass, 'pl-9')}
      />
    </div>
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

/**
 * Botón "compartir por WhatsApp" que aparece en la esquina de cada card.
 * - Habilitado → captura la card como PNG y comparte vía Web Share API
 *   (móvil) o descarga imagen + abre `wa.me/<phone>` (desktop).
 * - Deshabilitado (sin teléfono / sin encargado) → tooltip explicativo,
 *   el ícono se atenúa.
 *
 * El botón trae `data-share-hide="true"` para que la utilidad de captura
 * lo omita — así no aparece dentro de la imagen resultante.
 */
function ShareButton({
  getElement,
  phone,
  disabledReason,
  fileName,
  message,
}: {
  getElement: () => HTMLElement | null;
  phone: string | null;
  disabledReason: string | null;
  fileName: string;
  message: string;
}) {
  const [busy, setBusy] = useState(false);
  const disabled = disabledReason !== null;

  const handleClick = async () => {
    if (disabled || busy) return;
    const el = getElement();
    if (!el) return;
    setBusy(true);
    try {
      const result = await shareCardImage({
        element: el,
        phone,
        message,
        fileName,
      });
      if (result.ok) {
        toast.success(
          result.mode === 'native'
            ? 'Compartido por WhatsApp'
            : 'Imagen descargada — abrí el chat para adjuntarla',
        );
      } else if (result.reason === 'cancelled') {
        // Silencio — el usuario canceló el picker.
      } else if (result.reason === 'no_phone') {
        toast.error('No hay teléfono configurado');
      } else {
        toast.error('No se pudo generar la imagen');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      data-share-hide="true"
      onClick={handleClick}
      disabled={disabled || busy}
      title={disabled ? (disabledReason ?? undefined) : 'Compartir por WhatsApp'}
      aria-label="Compartir por WhatsApp"
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-emerald-700 transition',
        disabled
          ? 'cursor-not-allowed bg-muted/50 text-muted-foreground/50'
          : 'bg-emerald-500/10 hover:bg-emerald-500/20',
        busy && 'animate-pulse',
      )}
    >
      <Share2 className="size-4" strokeWidth={2.4} />
    </button>
  );
}
