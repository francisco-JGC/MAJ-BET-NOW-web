import { useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import {
  useDeleteSaleLimitByNumber,
  useSaleLimitsByNumber,
  useUpsertSaleLimitByNumber,
} from '@/features/sale-limits-by-number/hooks/use-sale-limits-by-number';
import { cn } from '@/shared/lib/cn';
import { Select } from '@/shared/ui/select';

import type { SalePoint } from '@/features/sale-points/types';

/**
 * Sección de "Límites por número". Convive con el "Límite general" del
 * mismo (juego, sucursal) — cuando existe un tope específico acá, el
 * backend lo prioriza sobre el general.
 */
export function LimitsByNumberSection({
  salePoint,
}: {
  salePoint: SalePoint;
}) {
  const { data: games } = useGames();
  const { data: limits, isLoading, error } = useSaleLimitsByNumber(salePoint.id);

  const gamesActive = useMemo(
    () => (games ?? []).filter((g) => g.isActive && g.type !== 'multi_sorteo'),
    [games],
  );
  const gameById = useMemo(
    () => new Map((games ?? []).map((g) => [g.id, g])),
    [games],
  );

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-bold text-foreground">
          Límites por número
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tope específico en córdobas para un número puntual de un juego.
          Este tope <strong>prevalece</strong> sobre el límite general de
          la sección "Límites de venta". Se resetea automáticamente al
          cambiar de sorteo.
        </p>
      </div>

      {error && (
        <div className="px-6 py-4 text-sm text-destructive">
          No se pudieron cargar los topes: {error.message}
        </div>
      )}

      <div className="px-6 py-4">
        <AddLimitForm salePoint={salePoint} games={gamesActive} />
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto size-5 animate-spin" />
        </div>
      ) : (limits ?? []).length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Aún no hay topes específicos configurados en esta sucursal.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {(limits ?? []).map((limit) => (
            <LimitRow
              key={limit.id}
              limit={limit}
              gameName={gameById.get(limit.gameId)?.name ?? '—'}
              salePointId={salePoint.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddLimitForm({
  salePoint,
  games,
}: {
  salePoint: SalePoint;
  games: readonly { id: string; name: string }[];
}) {
  const [gameId, setGameId] = useState('');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const upsert = useUpsertSaleLimitByNumber();

  const isValid =
    gameId.length > 0 &&
    label.trim().length > 0 &&
    Number.isInteger(Number(amount)) &&
    Number(amount) > 0;

  const handleAdd = async () => {
    setError(null);
    if (!isValid) {
      setError('Completá juego, número y monto (> 0).');
      return;
    }
    try {
      await upsert.mutateAsync({
        salePointId: salePoint.id,
        gameId,
        label: label.trim(),
        amount: Number(amount),
      });
      setLabel('');
      setAmount('');
    } catch {
      // toast already shown by hook
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Juego
        </label>
        <Select
          value={gameId}
          onChange={setGameId}
          placeholder="Elegí un juego"
          options={games.map((g) => ({ value: g.id, label: g.name }))}
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Número
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ej. 42"
          maxLength={40}
          className={inputClass}
        />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">
          Tope (C$)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="400"
          min={1}
          className={cn(inputClass, 'text-right tabular-nums')}
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!isValid || upsert.isPending}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground',
          !isValid || upsert.isPending
            ? 'cursor-not-allowed opacity-60'
            : 'hover:bg-primary/90',
        )}
      >
        {upsert.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" strokeWidth={2.6} />
        )}
        Agregar
      </button>
      {error && (
        <p className="w-full text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

function LimitRow({
  limit,
  gameName,
  salePointId,
}: {
  limit: {
    id: string;
    gameId: string;
    label: string;
    amount: number;
  };
  gameName: string;
  salePointId: string;
}) {
  const remove = useDeleteSaleLimitByNumber(salePointId);
  const isDeleting = remove.isPending && remove.variables === limit.id;

  return (
    <li className="flex items-center gap-4 px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {gameName}
        </div>
        <div className="text-xs text-muted-foreground">
          Número{' '}
          <span className="font-mono font-bold text-foreground">
            {limit.label}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold tabular-nums text-foreground">
          C${limit.amount}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          por sorteo
        </div>
      </div>
      <button
        type="button"
        onClick={() => remove.mutate(limit.id)}
        disabled={isDeleting}
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-500/10',
          isDeleting && 'cursor-not-allowed opacity-60',
        )}
        title="Eliminar tope"
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" strokeWidth={2.2} />
        )}
      </button>
    </li>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
