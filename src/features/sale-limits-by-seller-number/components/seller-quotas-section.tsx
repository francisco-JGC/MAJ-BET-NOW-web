import { useMemo, useState } from 'react';
import { Check, Loader2, Trash2 } from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import { useSaleLimitsByNumber } from '@/features/sale-limits-by-number/hooks/use-sale-limits-by-number';
import {
  useDeleteSaleLimitBySellerNumber,
  useSaleLimitsBySellerNumber,
  useUpsertSaleLimitBySellerNumber,
} from '@/features/sale-limits-by-seller-number/hooks/use-sale-limits-by-seller-number';
import { useUsers } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';

import type { SalePoint } from '@/features/sale-points/types';
import type { SaleLimitBySellerNumber } from '@/features/sale-limits-by-seller-number/types';
import type { User } from '@/features/users/types';
import { UserRole } from '@/features/users/types';

/**
 * Sección de "Cuotas por vendedor". Partner o admin reparte el tope de
 * un número entre los vendedores de la sucursal. Requiere que exista un
 * tope base en "Límites por número" — sin ese tope no hay techo bajo el
 * cual repartir.
 */
export function SellerQuotasSection({ salePoint }: { salePoint: SalePoint }) {
  const { data: games } = useGames();
  const {
    data: sucursalLimits,
    isLoading: loadingLimits,
    error: errorLimits,
  } = useSaleLimitsByNumber(salePoint.id);
  const {
    data: quotas,
    isLoading: loadingQuotas,
    error: errorQuotas,
  } = useSaleLimitsBySellerNumber(salePoint.id);
  // `useUsers` no acepta filtro por sucursal en su params — traemos todos
  // los sellers y filtramos localmente por `salePointId`. El backend ya
  // aplica el partner scope, así que un partner solo verá sellers de sus
  // sucursales accesibles.
  const { data: sellersPage, isLoading: loadingSellers } = useUsers({
    role: UserRole.SELLER,
    limit: 500,
    offset: 0,
  });

  const gameById = useMemo(
    () => new Map((games ?? []).map((g) => [g.id, g])),
    [games],
  );
  const sellers = useMemo(
    () =>
      (sellersPage?.items ?? []).filter(
        (u) => u.isActive && u.salePointId === salePoint.id,
      ),
    [sellersPage, salePoint.id],
  );

  const isLoading = loadingLimits || loadingQuotas || loadingSellers;
  const error = errorLimits ?? errorQuotas;

  // Solo mostramos grupos para (game, label) que YA tienen un tope de
  // sucursal — sin tope no hay nada que repartir (el partner ni lo puede
  // guardar, el backend lo rechaza).
  const groups = useMemo(() => {
    const limits = sucursalLimits ?? [];
    return limits
      .filter((l) => l.salePointId === salePoint.id)
      .map((l) => {
        const gameName = gameById.get(l.gameId)?.name ?? '—';
        const groupQuotas = (quotas ?? []).filter(
          (q) => q.gameId === l.gameId && q.label === l.label,
        );
        return {
          gameId: l.gameId,
          gameName,
          label: l.label,
          sucursalCap: l.amount,
          quotas: groupQuotas,
        };
      })
      .sort((a, b) =>
        a.gameName === b.gameName
          ? a.label.localeCompare(b.label)
          : a.gameName.localeCompare(b.gameName),
      );
  }, [sucursalLimits, quotas, salePoint.id, gameById]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-bold text-foreground">
          Cuotas por vendedor
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Repartí el tope de un número entre tus vendedores. La suma no puede
          superar el tope de sucursal. Los vendedores sin cuota asignada
          comparten el <strong>pool sobrante</strong> (tope − suma de cuotas)
          y respetan igual el tope global. Sin tope base en la sección
          "Límites por número" no se puede asignar cuotas.
        </p>
      </div>

      {error && (
        <div className="px-6 py-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-5 animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Todavía no hay topes por número en esta sucursal. Configuralos
          primero en la sección{' '}
          <span className="font-semibold">"Límites por número"</span> para
          poder repartirlos entre vendedores.
        </div>
      ) : sellers.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No hay vendedores activos en esta sucursal.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {groups.map((g) => (
            <GroupBlock
              key={`${g.gameId}::${g.label}`}
              salePointId={salePoint.id}
              gameId={g.gameId}
              gameName={g.gameName}
              label={g.label}
              sucursalCap={g.sucursalCap}
              quotas={g.quotas}
              sellers={sellers}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface GroupBlockProps {
  salePointId: string;
  gameId: string;
  gameName: string;
  label: string;
  sucursalCap: number;
  quotas: SaleLimitBySellerNumber[];
  sellers: User[];
}

function GroupBlock({
  salePointId,
  gameId,
  gameName,
  label,
  sucursalCap,
  quotas,
  sellers,
}: GroupBlockProps) {
  const totalAssigned = useMemo(
    () => quotas.reduce((acc, q) => acc + q.amount, 0),
    [quotas],
  );
  const remaining = Math.max(0, sucursalCap - totalAssigned);
  const overCap = totalAssigned > sucursalCap;

  const quotaBySeller = useMemo(
    () => new Map(quotas.map((q) => [q.sellerId, q])),
    [quotas],
  );

  return (
    <li className="px-6 py-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-foreground">
            {gameName} · Número{' '}
            <span className="font-mono">{label}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Tope de sucursal: {formatCurrency(sucursalCap)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatChip
            tone={overCap ? 'rose' : 'indigo'}
            label="Asignado"
            value={formatCurrency(totalAssigned)}
          />
          <StatChip
            tone={overCap ? 'rose' : 'emerald'}
            label="Pool sobrante"
            value={formatCurrency(remaining)}
          />
        </div>
      </header>

      {overCap && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          La suma de cuotas supera el tope de sucursal. Ajustá o eliminá
          alguna para volver dentro del límite.
        </div>
      )}

      <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border">
        {sellers.map((s) => (
          <SellerQuotaRow
            key={s.id}
            salePointId={salePointId}
            gameId={gameId}
            label={label}
            sucursalCap={sucursalCap}
            sumOthers={totalAssigned - (quotaBySeller.get(s.id)?.amount ?? 0)}
            seller={s}
            existing={quotaBySeller.get(s.id)}
          />
        ))}
      </ul>
    </li>
  );
}

function SellerQuotaRow({
  salePointId,
  gameId,
  label,
  sucursalCap,
  sumOthers,
  seller,
  existing,
}: {
  salePointId: string;
  gameId: string;
  label: string;
  sucursalCap: number;
  sumOthers: number;
  seller: User;
  existing?: SaleLimitBySellerNumber;
}) {
  const [value, setValue] = useState<string>(
    existing ? String(existing.amount) : '',
  );
  const [pendingSave, setPendingSave] = useState(false);

  const upsert = useUpsertSaleLimitBySellerNumber();
  const remove = useDeleteSaleLimitBySellerNumber(salePointId);

  const parsed = value.trim() === '' ? null : Number.parseInt(value, 10);
  const isValidNumber =
    parsed !== null && Number.isInteger(parsed) && parsed >= 1;
  const changed = existing ? existing.amount !== parsed : parsed !== null;
  const maxAllowed = Math.max(0, sucursalCap - sumOthers);
  const exceedsCap = isValidNumber && parsed > maxAllowed;

  const canSave = isValidNumber && changed && !exceedsCap;

  async function handleSave() {
    if (!canSave) return;
    setPendingSave(true);
    try {
      await upsert.mutateAsync({
        salePointId,
        sellerId: seller.id,
        gameId,
        label,
        amount: parsed!,
      });
    } finally {
      setPendingSave(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    await remove.mutateAsync(existing.id);
    setValue('');
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">
          {seller.name}
        </div>
        {existing && (
          <div className="text-[11px] text-muted-foreground">
            Cuota activa: {formatCurrency(existing.amount)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            C$
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Sin cuota"
            className={cn(
              'w-28 rounded-lg border bg-background pl-8 pr-2 py-1.5 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20',
              exceedsCap
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-border focus:border-primary',
            )}
          />
        </div>
        <button
          type="button"
          disabled={!canSave || pendingSave}
          onClick={handleSave}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-lg border transition',
            canSave
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
              : 'border-border/60 text-muted-foreground/50 cursor-not-allowed',
          )}
          aria-label="Guardar cuota"
          title={
            exceedsCap
              ? `Máximo asignable: ${formatCurrency(maxAllowed)}`
              : undefined
          }
        >
          {pendingSave ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" strokeWidth={2.6} />
          )}
        </button>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={remove.isPending}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 disabled:opacity-50"
            aria-label="Eliminar cuota"
          >
            {remove.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" strokeWidth={2.4} />
            )}
          </button>
        )}
      </div>
    </li>
  );
}

function StatChip({
  tone,
  label,
  value,
}: {
  tone: 'emerald' | 'indigo' | 'rose';
  label: string;
  value: string;
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
      : tone === 'indigo'
        ? 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20'
        : 'bg-rose-500/10 text-rose-700 ring-rose-500/20';
  return (
    <div
      className={cn(
        'rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset',
        toneClass,
      )}
    >
      <div className="text-[9px] uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="tabular-nums">{value}</div>
    </div>
  );
}
