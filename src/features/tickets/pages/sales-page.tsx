import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dices,
  MapPin,
  Receipt,
  Search,
  UserRound,
} from 'lucide-react';

import { useGames, useGameSchedules } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { TicketDetailsModal } from '@/features/tickets/components/ticket-details-modal';
import { useTickets } from '@/features/tickets/hooks/use-tickets';
import { useUsers } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import {
  SegmentedControl,
  type SegmentTab,
} from '@/shared/ui/segmented-control';
import { Select } from '@/shared/ui/select';
import { TableLoadingOverlay } from '@/shared/ui/table-loading-overlay';

import type { Game } from '@/features/games/types';
import type { SalePoint } from '@/features/sale-points/types';
import type { Ticket, TicketStatus } from '@/features/tickets/types';
import { UserRole } from '@/features/users/types';
import type { User } from '@/features/users/types';

type StatusFilter = 'all' | TicketStatus;

const STATUS_TABS: readonly SegmentTab<StatusFilter>[] = [
  { key: 'all', label: 'Todos' },
  { key: 'valid', label: 'Válidos', tone: 'emerald' },
  { key: 'voided', label: 'Anulados', tone: 'rose' },
] as const;

const PAGE_SIZE = 20;

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MANAGUA = 'America/Managua';
const DATE_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const TIME_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function formatManaguaDateTime(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

function formatManaguaTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}

/** "18:00" → "6:00 PM"; "09:30" → "9:30 AM". */
function formatDrawTimeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function SalesPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [gameId, setGameId] = useState('');
  const [drawTime, setDrawTime] = useState('');
  const [salePointId, setSalePointId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [from, setFrom] = useState(isoDate(new Date()));
  const [to, setTo] = useState(isoDate(new Date()));
  const [search, setSearch] = useState('');
  // Debounce: mandamos el search al backend después de 300ms sin cambios
  // para no disparar un request en cada keystroke. El filtro por folio
  // vive server-side desde que el backend ignora el rango de fechas cuando
  // llega `search` — de otro modo los folios de otros días no aparecían.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      gameId: gameId || undefined,
      drawTime: drawTime || undefined,
      salePointId: salePointId || undefined,
      sellerId: sellerId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? endOfDayParam(to) : undefined,
      search: debouncedSearch || undefined,
    }),
    [
      status,
      gameId,
      drawTime,
      salePointId,
      sellerId,
      from,
      to,
      debouncedSearch,
    ],
  );

  const { data, isLoading, error, isFetching } = useTickets(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const { data: games } = useGames();
  const { data: salePoints } = useSalePoints();
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 100,
    offset: 0,
  });
  // Schedules for the selected game populate the "Sorteo" dropdown.
  const { data: schedules } = useGameSchedules(gameId || null);

  // Reset draw-time whenever the selected game changes, otherwise you can
  // end up with a stale filter that no longer matches any schedule.
  const resetDrawTimeOnGameChange = (nextGameId: string) => {
    setGameId(nextGameId);
    setDrawTime('');
    setPage(0);
  };

  const gameById = useMemo(() => {
    const m = new Map<string, Game>();
    for (const g of games ?? []) m.set(g.id, g);
    return m;
  }, [games]);
  const salePointById = useMemo(() => {
    const m = new Map<string, SalePoint>();
    for (const sp of salePoints ?? []) m.set(sp.id, sp);
    return m;
  }, [salePoints]);
  const userById = useMemo(() => {
    const m = new Map<string, User>();
    for (const u of sellersPage?.items ?? []) m.set(u.id, u);
    return m;
  }, [sellersPage]);

  // Unique schedule times, sorted ascending. A game can have multiple
  // schedules with the same time (different weekdays) — dedupe them so the
  // dropdown only lists each "sorteo hour" once.
  const scheduleOptions = useMemo(() => {
    const seen = new Set<string>();
    return (schedules ?? [])
      .filter((s) => s.isActive)
      .filter((s) => (seen.has(s.drawTime) ? false : (seen.add(s.drawTime), true)))
      .sort((a, b) => a.drawTime.localeCompare(b.drawTime));
  }, [schedules]);

  // El filtrado por folio/cliente ahora ocurre server-side (ver `params.search`).
  // Nombre `filteredItems` retenido porque `pagedItems` y las stats lo consumen.
  const filteredItems = items;

  const stats = useMemo(() => {
    // `billed` y `won` los devuelve el server calculados sobre el rango
    // completo. `voided` es local — cuenta los items visibles (con el
    // limit 100k del server prácticamente coincide con el total real).
    let voided = 0;
    for (const t of items) {
      if (t.status === 'voided') voided += 1;
    }
    return {
      total,
      billed: data?.totalBilled ?? 0,
      won: data?.totalWonPrize ?? 0,
      voided,
    };
  }, [items, total, data]);

  // Paginación en cliente sobre `filteredItems`: el server ya devuelve
  // todo el rango, la UI solo trocea de a PAGE_SIZE para no renderizar
  // miles de filas de una.
  const pagedItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);
  const filteredCount = filteredItems.length;
  const rangeStart = filteredCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filteredCount, (page + 1) * PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = rangeEnd < filteredCount;

  const selectedTicket = useMemo(
    () => items.find((t) => t.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Ventas</h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{stats.total}</span>{' '}
            tickets · <span className="font-semibold text-emerald-700">{formatCurrency(stats.billed)}</span> facturado
            {' · '}
            <span className="font-semibold text-rose-700">{formatCurrency(stats.won)}</span> ganado
            {stats.voided > 0 && (
              <> · <span className="font-semibold text-rose-700">{stats.voided}</span> anulados</>
            )}
          </span>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Filtrar por estado"
            tabs={STATUS_TABS}
            value={status}
            onChange={(next) => {
              setStatus(next);
              setPage(0);
            }}
          />
          <div className="relative min-w-56 flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por folio o cliente"
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Field label="Juego">
            <Select
              value={gameId}
              onChange={resetDrawTimeOnGameChange}
              leadingIcon={<Dices className="size-4" />}
              placeholder="Todos"
              options={[
                { value: '', label: 'Todos los juegos' },
                ...(games?.map((g) => ({ value: g.id, label: g.name })) ?? []),
              ]}
            />
          </Field>
          <Field
            label="Sorteo"
            hint={!gameId ? 'Elegí un juego primero' : undefined}
          >
            <Select
              value={drawTime}
              onChange={(v) => {
                setDrawTime(v);
                setPage(0);
              }}
              leadingIcon={<Clock className="size-4" />}
              placeholder={
                !gameId
                  ? 'Todos los sorteos'
                  : scheduleOptions.length === 0
                    ? 'Sin sorteos configurados'
                    : 'Todos los sorteos'
              }
              disabled={!gameId || scheduleOptions.length === 0}
              options={[
                { value: '', label: 'Todos los sorteos' },
                ...scheduleOptions.map((s) => ({
                  value: s.drawTime,
                  label: formatDrawTimeLabel(s.drawTime),
                })),
              ]}
            />
          </Field>
          <Field label="Sucursal">
            <Select
              value={salePointId}
              onChange={(v) => {
                setSalePointId(v);
                setPage(0);
              }}
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
              onChange={(v) => {
                setSellerId(v);
                setPage(0);
              }}
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
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(0);
                  }}
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
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(0);
                  }}
                  className={cn(inputClass, 'pl-9')}
                />
              </div>
            </Field>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar las ventas: {error.message}
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
                <th className="px-6 py-3">Folio</th>
                <th className="px-6 py-3">Creado</th>
                <th className="px-6 py-3">Sucursal</th>
                <th className="px-6 py-3">Vendedor</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Sorteo</th>
                <th className="px-6 py-3 text-right">Líneas</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && items.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-14 text-center text-sm text-muted-foreground"
                  >
                    {search || status !== 'all' || gameId || salePointId || sellerId
                      ? 'Ningún ticket coincide con los filtros.'
                      : 'Aún no hay tickets en este rango.'}
                  </td>
                </tr>
              ) : (
                pagedItems.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    gameName={gameById.get(ticket.gameId)?.name ?? '—'}
                    salePointName={
                      salePointById.get(ticket.salePointId)?.name ?? '—'
                    }
                    sellerName={userById.get(ticket.sellerId)?.name ?? '—'}
                    onClick={() => setSelectedId(ticket.id)}
                  />
                ))
              )}
            </tbody>
          </table>

          <TableLoadingOverlay show={isFetching && items.length > 0} />
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <span>
            {isFetching ? (
              <span className="text-muted-foreground/70">Cargando…</span>
            ) : total === 0 ? (
              'Sin resultados'
            ) : (
              <>
                {rangeStart}–{rangeEnd} de{' '}
                <span className="font-semibold text-foreground">{total}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev}
              className={cn(
                'flex size-8 items-center justify-center rounded-md',
                hasPrev
                  ? 'text-foreground hover:bg-secondary'
                  : 'cursor-not-allowed text-muted-foreground/40',
              )}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className={cn(
                'flex size-8 items-center justify-center rounded-md',
                hasNext
                  ? 'text-foreground hover:bg-secondary'
                  : 'cursor-not-allowed text-muted-foreground/40',
              )}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </footer>
      </div>

      <TicketDetailsModal
        open={selectedTicket !== null}
        onClose={() => setSelectedId(null)}
        ticket={selectedTicket}
        gameName={selectedTicket ? gameById.get(selectedTicket.gameId)?.name ?? null : null}
        salePointName={
          selectedTicket ? salePointById.get(selectedTicket.salePointId)?.name ?? null : null
        }
        sellerName={
          selectedTicket ? userById.get(selectedTicket.sellerId)?.name ?? null : null
        }
      />
    </div>
  );
}

function TicketRow({
  ticket,
  gameName,
  salePointName,
  sellerName,
  onClick,
}: {
  ticket: Ticket;
  gameName: string;
  salePointName: string;
  sellerName: string;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'cursor-pointer transition hover:bg-slate-50/60',
        ticket.status === 'voided' && 'opacity-60',
      )}
    >
      <td className="px-6 py-3.5 font-mono text-xs font-semibold text-foreground">
        {ticket.folio}
      </td>
      <td className="px-6 py-3.5 text-muted-foreground">
        {formatManaguaDateTime(ticket.createdAt)}
      </td>
      <td className="px-6 py-3.5 text-foreground">{salePointName}</td>
      <td className="px-6 py-3.5 text-muted-foreground">{sellerName}</td>
      <td className="px-6 py-3.5 text-foreground">
        {ticket.client && ticket.client.trim().length > 0 ? (
          ticket.client
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-6 py-3.5">
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{gameName}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatManaguaTime(ticket.drawAt)}
          </span>
        </div>
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums text-muted-foreground">
        {ticket.count}
      </td>
      <td className="px-6 py-3.5 text-right tabular-nums font-semibold text-foreground">
        {formatCurrency(ticket.total)}
      </td>
      <td className="px-6 py-3.5">
        <StatusBadge status={ticket.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  return status === 'valid' ? (
    <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
      Válido
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20">
      Anulado
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[11px] text-muted-foreground/70">
          {hint}
        </span>
      )}
    </label>
  );
}
