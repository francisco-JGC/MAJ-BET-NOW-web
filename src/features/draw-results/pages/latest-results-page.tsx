import { useMemo, useState } from 'react';
import { Calendar, Dices, History, Plus, Trophy } from 'lucide-react';

import { RegisterResultModal } from '@/features/draw-results/components/register-result-modal';
import { useDrawResults } from '@/features/draw-results/hooks/use-draw-results';
import { useGames } from '@/features/games/hooks/use-games';
import { cn } from '@/shared/lib/cn';
import { Select } from '@/shared/ui/select';

import type { DrawResult } from '@/features/draw-results/types';
import type { Game } from '@/features/games/types';

const DEFAULT_LIMIT = 200;

/** Local "YYYY-MM-DD" (no timezone conversion). */
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

export function LatestResultsPage() {
  const [gameId, setGameId] = useState<string>('');
  const [from, setFrom] = useState<string>(daysAgoIso(7));
  const [to, setTo] = useState<string>(todayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DrawResult | null>(null);

  // Managua wall-clock day boundaries. Using UTC (`Z`) here dropped late
  // evening draws whose absolute instant already rolled over to the next
  // UTC day — the seller registers them for "today" but they never showed
  // up in the list. Nicaragua sits at fixed UTC-6 (no DST) so pinning
  // `-06:00` is safe year-round.
  const params = useMemo(
    () => ({
      gameId: gameId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
      limit: DEFAULT_LIMIT,
      offset: 0,
    }),
    [gameId, from, to],
  );

  const { data: games } = useGames();
  const { data, isLoading, error } = useDrawResults(params);

  const gameById = useMemo(() => {
    const map = new Map<string, Game>();
    for (const g of games ?? []) map.set(g.id, g);
    return map;
  }, [games]);

  // Server already returns rows sorted by (day DESC, game.orderIndex ASC,
  // drawAt ASC); we only need to bucket them by day for the UI.
  const grouped = useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">
            Últimos resultados
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {data.length}
              </span>{' '}
              {data.length === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" strokeWidth={2.8} />
            Registrar resultado
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:grid-cols-3">
        <Field label="Juego">
          <Select
            value={gameId}
            onChange={(v) => setGameId(v)}
            leadingIcon={<Dices className="size-4" />}
            placeholder="Todos los juegos"
            ariaLabel="Filtrar por juego"
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

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar los resultados: {error.message}
        </div>
      )}

      {isLoading && grouped.length === 0 && <ListSkeleton />}

      {!isLoading && grouped.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Trophy className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No hay resultados registrados en este rango.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map((group) => (
          <DayGroup
            key={group.dayKey}
            group={group}
            gameById={gameById}
            onEdit={(r) => setEditing(r)}
          />
        ))}
      </div>

      <RegisterResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <RegisterResultModal
        open={editing !== null}
        existing={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

interface GroupedResults {
  dayKey: string;
  label: string;
  items: DrawResult[];
}

/** "YYYY-MM-DD" of an ISO instant as seen in Managua wall-clock. */
function managuaDayKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Managua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

/**
 * Buckets already-sorted rows into day groups. The server returns items in
 * final render order (day DESC, game.orderIndex ASC, drawAt ASC); this
 * function preserves that order — no per-day resort needed here.
 */
function groupByDay(items: DrawResult[]): GroupedResults[] {
  const map = new Map<string, DrawResult[]>();
  const keyOrder: string[] = [];
  for (const item of items) {
    const key = managuaDayKey(item.drawAt);
    const bucket = map.get(key);
    if (!bucket) {
      map.set(key, [item]);
      keyOrder.push(key);
    } else {
      bucket.push(item);
    }
  }
  return keyOrder.map((dayKey) => ({
    dayKey,
    label: formatDayLabel(dayKey),
    items: map.get(dayKey)!,
  }));
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Hoy';
  if (sameDay(date, yesterday)) return 'Ayer';
  const label = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function DayGroup({
  group,
  gameById,
  onEdit,
}: {
  group: GroupedResults;
  gameById: Map<string, Game>;
  onEdit: (result: DrawResult) => void;
}) {
  return (
    <section>
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-black uppercase tracking-[0.08em] text-muted-foreground">
          {group.label}
        </h2>
        <span className="text-xs text-muted-foreground">
          {group.items.length}{' '}
          {group.items.length === 1 ? 'sorteo' : 'sorteos'}
        </span>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <ResultCard
            key={item.id}
            result={item}
            game={gameById.get(item.gameId) ?? null}
            onClick={() => onEdit(item)}
          />
        ))}
      </div>
    </section>
  );
}

function ResultCard({
  result,
  game,
  onClick,
}: {
  result: DrawResult;
  game: Game | null;
  onClick: () => void;
}) {
  const drawAt = new Date(result.drawAt);
  const time = new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(drawAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_10px_24px_-14px_rgba(15,23,42,0.18)]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-black text-white">
            {(game?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {game?.name ?? 'Juego desconocido'}
            </p>
            <p className="text-xs text-muted-foreground">{time}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-slate-900 px-3 py-2 font-mono text-xl font-black tracking-wider text-white shadow-inner ring-1 ring-black/20">
        {result.winningNumber}
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-indigo-500/10 opacity-40 blur-3xl transition group-hover:opacity-70" />
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((k) => (
        <div key={k} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-border/70 bg-card"
              />
            ))}
          </div>
        </div>
      ))}
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
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
