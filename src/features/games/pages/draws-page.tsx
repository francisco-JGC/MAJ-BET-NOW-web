import { useMemo, useState } from 'react';
import { CalendarClock, Dices, Loader2, Search } from 'lucide-react';

import { GameSchedulesModal } from '@/features/games/components/game-schedules-modal';
import { useGames, useToggleGame } from '@/features/games/hooks/use-games';
import { cn } from '@/shared/lib/cn';
import {
  SegmentedControl,
  type SegmentTab,
} from '@/shared/ui/segmented-control';

import type { Game, GameType } from '@/features/games/types';

type ActiveFilter = 'all' | 'active' | 'inactive';

const FILTER_TABS: readonly SegmentTab<ActiveFilter>[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos', tone: 'emerald' },
  { key: 'inactive', label: 'Inactivos', tone: 'rose' },
] as const;

const TYPE_LABELS: Record<GameType, string> = {
  regular: 'Regular',
  date: 'Fechas',
  three_digit: '3 dígitos',
  four_digit: '4 dígitos',
  multi_sorteo: 'Multi Sorteo',
};

const TYPE_TONE: Record<GameType, string> = {
  regular: 'bg-slate-100 text-slate-700 ring-slate-200',
  date: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
  three_digit: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20',
  four_digit: 'bg-fuchsia-500/10 text-fuchsia-700 ring-fuchsia-500/20',
  multi_sorteo: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
};

export function DrawsPage() {
  const [filter, setFilter] = useState<ActiveFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Game | null>(null);
  const { data, isLoading, error } = useGames();
  const toggle = useToggleGame();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((g) => {
      if (filter === 'active' && !g.isActive) return false;
      if (filter === 'inactive' && g.isActive) return false;
      if (q && !g.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filter, search]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      active: all.filter((g) => g.isActive).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dices className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Sorteos
          </h1>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{stats.active}</span>{' '}
          activos de{' '}
          <span className="font-semibold text-foreground">{stats.total}</span>{' '}
          juegos
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Filtrar juegos"
          tabs={FILTER_TABS}
          value={filter}
          onChange={setFilter}
        />
        <div className="relative min-w-64 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar juego"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudo cargar la lista: {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Juego</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3 text-right">Premio exacta</th>
                <th className="px-6 py-3 text-right">Premio fácil</th>
                <th className="px-6 py-3">Horarios</th>
                <th className="px-6 py-3 text-right">Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && filtered.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    {search || filter !== 'all'
                      ? 'Ningún juego coincide con tu búsqueda.'
                      : 'Aún no hay juegos.'}
                  </td>
                </tr>
              ) : (
                filtered.map((game) => (
                  <GameRow
                    key={game.id}
                    game={game}
                    isToggling={
                      toggle.isPending && toggle.variables?.id === game.id
                    }
                    onOpen={() => setSelected(game)}
                    onToggle={(next) =>
                      toggle.mutate({ id: game.id, active: next })
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GameSchedulesModal
        game={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function GameRow({
  game,
  isToggling,
  onOpen,
  onToggle,
}: {
  game: Game;
  isToggling: boolean;
  onOpen: () => void;
  onToggle: (next: boolean) => void;
}) {
  return (
    <tr
      className={cn(
        'transition',
        game.isActive ? 'hover:bg-slate-50/60' : 'opacity-60 hover:bg-slate-50/40',
      )}
    >
      <td
        className="cursor-pointer px-6 py-3.5"
        onClick={onOpen}
        role="button"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-black text-white">
            {game.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">
              {game.name}
            </div>
            <div className="text-xs text-muted-foreground">/{game.slug}</div>
          </div>
        </div>
      </td>
      <td className="cursor-pointer px-6 py-3.5" onClick={onOpen} role="button">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
            TYPE_TONE[game.type],
          )}
        >
          {TYPE_LABELS[game.type]}
        </span>
      </td>
      <td
        className="cursor-pointer px-6 py-3.5 text-right tabular-nums"
        onClick={onOpen}
        role="button"
      >
        {game.exactMultiplier !== null ? (
          <span className="font-semibold text-foreground">
            ×{game.exactMultiplier}
          </span>
        ) : (
          <Empty />
        )}
      </td>
      <td
        className="cursor-pointer px-6 py-3.5 text-right tabular-nums text-muted-foreground"
        onClick={onOpen}
        role="button"
      >
        {game.easyMultiplier !== null ? (
          <>
            ×{game.easyMultiplier}
            {game.pairEasyMultiplier !== null && (
              <span className="ml-1 text-[11px] text-indigo-700">
                (par ×{game.pairEasyMultiplier})
              </span>
            )}
          </>
        ) : (
          <Empty />
        )}
      </td>
      <td className="px-6 py-3.5">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-500/10"
        >
          <CalendarClock className="size-3.5" strokeWidth={2.4} />
          Ver horarios
        </button>
      </td>
      <td className="px-6 py-3.5 text-right">
        <Toggle
          checked={game.isActive}
          onChange={onToggle}
          disabled={isToggling}
          busy={isToggling}
          label={game.isActive ? 'Activo' : 'Inactivo'}
        />
      </td>
    </tr>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  busy,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition',
          checked ? 'bg-emerald-500' : 'bg-slate-300',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <span
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
          )}
        >
          {busy && <Loader2 className="size-3 animate-spin text-slate-500" />}
        </span>
      </button>
      <span
        className={cn(
          'text-xs font-semibold',
          checked ? 'text-emerald-700' : 'text-slate-500',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/50">—</span>;
}

function SkeletonRow() {
  return (
    <tr>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}
