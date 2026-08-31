import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Dices,
  MapPin,
  Search,
  Trophy,
  UserRound,
} from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { TicketDetailsModal } from '@/features/tickets/components/ticket-details-modal';
import { useUsers } from '@/features/users/hooks/use-users';
import { WinnerDetailsModal } from '@/features/winners/components/winner-details-modal';
import { useWinners } from '@/features/winners/hooks/use-winners';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { Select } from '@/shared/ui/select';

import type { Game } from '@/features/games/types';
import type { SalePoint } from '@/features/sale-points/types';
import type { Ticket } from '@/features/tickets/types';
import { UserRole } from '@/features/users/types';
import type { User } from '@/features/users/types';
import type { WinningTicket } from '@/features/winners/types';

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function WinnersPage() {
  const [gameId, setGameId] = useState<string>('');
  const [salePointId, setSalePointId] = useState<string>('');
  const [sellerId, setSellerId] = useState<string>('');
  const [from, setFrom] = useState<string>(isoDate(new Date()));
  const [to, setTo] = useState<string>(isoDate(new Date()));
  const [search, setSearch] = useState('');
  // Debounce igual que en `sales-page` — el filtro server-side sobre folio
  // ignora rango de fechas, así que un folio de otro día aparece igual.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);
  const [selected, setSelected] = useState<WinningTicket | null>(null);
  // Ticket completo abierto desde el modal de ganador. Solo uno de los
  // dos modales está visible a la vez — al abrir el detalle cerramos el
  // de ganador para no apilarlos.
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);

  const params = useMemo(
    () => ({
      gameId: gameId || undefined,
      salePointId: salePointId || undefined,
      sellerId: sellerId || undefined,
      from: from ? `${from}T00:00:00-06:00` : undefined,
      to: to ? `${to}T23:59:59-06:00` : undefined,
      search: debouncedSearch || undefined,
    }),
    [gameId, salePointId, sellerId, from, to, debouncedSearch],
  );

  const winnersQuery = useWinners(params);
  const winners: WinningTicket[] = winnersQuery.data ?? [];
  const isLoading = winnersQuery.isLoading;
  const error = winnersQuery.error;

  const { data: games } = useGames();
  const { data: salePoints } = useSalePoints();
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 100,
    offset: 0,
  });

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

  // Filtro por folio/cliente vive server-side (ver `params.search`); acá
  // simplemente reenviamos la lista.
  const filtered = winners;

  const stats = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const w of winners) {
      count += 1;
      amount += w.totalPrize;
    }
    return { count, amount };
  }, [winners]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Ganadores</h1>
        </div>
      </header>

      <div className="grid gap-4">
        <StatCard
          tone="amber"
          label="Total ganado por clientes"
          count={stats.count}
          amount={stats.amount}
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-3">
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Juego">
            <Select
              value={gameId}
              onChange={setGameId}
              leadingIcon={<Dices className="size-4" />}
              placeholder="Todos los juegos"
              options={[
                { value: '', label: 'Todos los juegos' },
                ...(games?.map((g) => ({ value: g.id, label: g.name })) ?? []),
              ]}
            />
          </Field>
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
          <div className="grid grid-cols-2 gap-2">
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
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          No se pudieron cargar los ganadores: {error.message}
        </div>
      )}

      {isLoading && winners.length === 0 && <ListSkeleton />}

      {!isLoading && filtered.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
          <Trophy className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {search || gameId || salePointId || sellerId
              ? 'No hay ganadores que coincidan con tus filtros.'
              : 'No hay boletos ganadores en el rango seleccionado.'}
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((w) => (
          <WinnerCard
            key={w.ticket.id}
            winner={w}
            gameName={gameById.get(w.ticket.gameId)?.name ?? null}
            sellerName={userById.get(w.ticket.sellerId)?.name ?? null}
            salePointName={
              salePointById.get(w.ticket.salePointId)?.name ?? null
            }
            onClick={() => setSelected(w)}
          />
        ))}
      </div>

      {selected && (
        <WinnerDetailsModal
          winner={selected}
          gameName={gameById.get(selected.ticket.gameId)?.name ?? null}
          sellerName={userById.get(selected.ticket.sellerId)?.name ?? null}
          salePointName={
            salePointById.get(selected.ticket.salePointId)?.name ?? null
          }
          onClose={() => setSelected(null)}
          onViewTicket={() => {
            // Un ganador implica que el sorteo ya se ejecutó. Forzamos
            // `drawExecuted: true` para que el modal de detalle no
            // habilite el botón de anular (que solo aplica antes del
            // sorteo). El endpoint de ganadores no lo emite bien hoy.
            setViewingTicket({
              ...selected.ticket,
              drawExecuted: true,
              wonPrize: selected.totalPrize,
            });
            setSelected(null);
          }}
        />
      )}

      {viewingTicket && (
        <TicketDetailsModal
          open
          onClose={() => setViewingTicket(null)}
          ticket={viewingTicket}
          gameName={gameById.get(viewingTicket.gameId)?.name ?? null}
          sellerName={userById.get(viewingTicket.sellerId)?.name ?? null}
          salePointName={
            salePointById.get(viewingTicket.salePointId)?.name ?? null
          }
        />
      )}
    </div>
  );
}

function WinnerCard({
  winner,
  gameName,
  sellerName,
  salePointName,
  onClick,
}: {
  winner: WinningTicket;
  gameName: string | null;
  sellerName: string | null;
  salePointName: string | null;
  onClick: () => void;
}) {
  const { ticket, totalPrize } = winner;
  const drawAt = new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ticket.drawAt));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-amber-500/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">
            {gameName ?? 'Juego desconocido'}
          </p>
          <p className="text-xs text-muted-foreground">{drawAt}</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Premio
          </p>
          <p className="text-2xl font-black tabular-nums text-amber-800">
            {formatCurrency(totalPrize)}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono font-bold text-foreground">
            #{ticket.folio}
          </p>
          {ticket.client && (
            <p className="truncate text-muted-foreground">{ticket.client}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {sellerName && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
            <UserRound className="size-3" />
            {sellerName}
          </span>
        )}
        {salePointName && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
            <MapPin className="size-3" />
            {salePointName}
          </span>
        )}
      </div>
    </button>
  );
}

function StatCard({
  tone,
  label,
  count,
  amount,
}: {
  tone: 'amber' | 'emerald';
  label: string;
  count: number;
  amount: number;
}) {
  const style =
    tone === 'amber'
      ? 'from-amber-500 to-orange-500'
      : 'from-emerald-500 to-teal-500';
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md',
        style,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/80">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tight">
          {formatCurrency(amount)}
        </span>
        <span className="text-sm font-semibold text-white/85">
          · {count} {count === 1 ? 'boleto' : 'boletos'}
        </span>
      </div>
      <div className="pointer-events-none absolute -right-8 -bottom-8 size-32 rounded-full bg-white/15 blur-2xl" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-2xl border border-border/70 bg-card"
        />
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
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
