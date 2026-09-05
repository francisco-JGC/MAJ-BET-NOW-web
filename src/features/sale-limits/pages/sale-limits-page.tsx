import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Layers, Loader2, MapPin, ShieldAlert } from 'lucide-react';

import { useGames } from '@/features/games/hooks/use-games';
import {
  useDeleteSaleLimitByNumber,
  useSaleLimitsByNumber,
  useUpsertSaleLimitByNumber,
} from '@/features/sale-limits-by-number/hooks/use-sale-limits-by-number';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useSalesByNumber } from '@/features/sales-by-number/hooks/use-sales-by-number';
import { endOfDayParam, formatCurrency } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import type { Game } from '@/features/games/types';
import type { SaleLimitByNumber } from '@/features/sale-limits-by-number/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

const MONTHS_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'] as const;
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'] as const;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function generateLabels(game: Game): string[] {
  switch (game.type) {
    case 'regular':
      return Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
    case 'three_digit':
      return Array.from({ length: 1000 }, (_, i) => i.toString().padStart(3, '0'));
    case 'four_digit':
      return Array.from({ length: 10000 }, (_, i) => i.toString().padStart(4, '0'));
    case 'date': {
      const labels: string[] = [];
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= DAYS_PER_MONTH[m]; d++) {
          labels.push(`${d.toString().padStart(2, '0')} ${MONTHS_ABBR[m]}`);
        }
      }
      return labels;
    }
    default:
      return [];
  }
}

/** Convert sales-by-number date label "DD-MM" → "DD mon" used by limits. */
function normSaleLabel(rawLabel: string, isDate: boolean): string {
  if (!isDate) return rawLabel;
  const parts = rawLabel.split('-');
  if (parts.length !== 2) return rawLabel;
  const [dd, mm] = parts;
  const idx = parseInt(mm, 10) - 1;
  if (idx < 0 || idx > 11) return rawLabel;
  return `${dd} ${MONTHS_ABBR[idx]}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SaleLimitsPage() {
  const [salePointId, setSalePointId] = useState('');
  const [activeGameId, setActiveGameId] = useState('');
  const today = useMemo(isoToday, []);

  const { data: games } = useGames();
  const { data: salePoints, isLoading: loadingSalePoints } = useSalePoints();
  const { data: limits, isLoading: loadingLimits } = useSaleLimitsByNumber(
    salePointId || null,
  );

  const salesParams = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      gameId: activeGameId || undefined,
      from: salePointId ? `${today}T00:00:00-06:00` : undefined,
      to: salePointId ? endOfDayParam(today) : undefined,
    }),
    [salePointId, activeGameId, today],
  );
  const { data: salesData } = useSalesByNumber(salesParams);

  const gamesActive = useMemo(
    () => (games ?? []).filter((g) => g.isActive && g.type !== 'multi_sorteo'),
    [games],
  );

  const salePointsActive = useMemo(
    () => (salePoints ?? []).filter((sp) => sp.isActive),
    [salePoints],
  );

  useEffect(() => {
    if (!activeGameId && gamesActive.length > 0) {
      setActiveGameId(gamesActive[0].id);
    }
  }, [gamesActive, activeGameId]);

  const activeGame = gamesActive.find((g) => g.id === activeGameId) ?? gamesActive[0];
  const isDate = activeGame?.type === 'date';

  const limitsByLabel = useMemo(() => {
    const map = new Map<string, SaleLimitByNumber>();
    for (const l of limits ?? []) {
      if (l.gameId === activeGame?.id) map.set(l.label, l);
    }
    return map;
  }, [limits, activeGame]);

  const salesByLabel = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of salesData?.items ?? []) {
      if (row.gameId !== activeGame?.id) continue;
      const key = normSaleLabel(row.label, isDate);
      map.set(key, (map.get(key) ?? 0) + row.totalAmount);
    }
    return map;
  }, [salesData, activeGame, isDate]);

  const labels = useMemo(
    () => (activeGame ? generateLabels(activeGame) : []),
    [activeGame],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-black tracking-tight">Límites de Venta</h1>
        </div>
        <p className="max-w-md text-xs text-muted-foreground">
          Tope en córdobas por número por sorteo. Al alcanzarse, ese número queda
          bloqueado hasta el siguiente sorteo. Se resetea automáticamente.
        </p>
      </header>

      {/* Sucursal selector */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold text-muted-foreground">
            Sucursal
          </span>
          <Select
            value={salePointId}
            onChange={setSalePointId}
            leadingIcon={<MapPin className="size-4" />}
            placeholder={
              loadingSalePoints ? 'Cargando…' : 'Elegí la sucursal a configurar'
            }
            disabled={loadingSalePoints}
            options={salePointsActive.map((sp) => ({
              value: sp.id,
              label: sp.name,
            }))}
          />
        </label>
      </div>

      {!salePointId ? (
        <EmptyState />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {/* Game tabs */}
          <div className="overflow-x-auto border-b border-border">
            <div className="flex min-w-max">
              {gamesActive.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGameId(g.id)}
                  className={cn(
                    'whitespace-nowrap px-5 py-3 text-sm font-semibold transition-colors',
                    g.id === activeGame?.id
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Numbers table */}
          <div className="p-4">
            {activeGame && (
              <NumbersTable
                key={`${salePointId}-${activeGame.id}`}
                game={activeGame}
                salePointId={salePointId}
                labels={labels}
                limitsByLabel={limitsByLabel}
                salesByLabel={salesByLabel}
                loading={loadingLimits}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NumbersTable ─────────────────────────────────────────────────────────────

function NumbersTable({
  game,
  salePointId,
  labels,
  limitsByLabel,
  salesByLabel,
  loading,
}: {
  game: Game;
  salePointId: string;
  labels: string[];
  limitsByLabel: Map<string, SaleLimitByNumber>;
  salesByLabel: Map<string, number>;
  loading: boolean;
}) {
  const [page, setPage] = useState(0);
  const needsPaging = labels.length > PAGE_SIZE;
  const totalPages = Math.ceil(labels.length / PAGE_SIZE);

  const visible = needsPaging
    ? labels.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : labels;

  const rangeStart = page * PAGE_SIZE;
  const rangeEnd = Math.min(rangeStart + PAGE_SIZE - 1, labels.length - 1);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {needsPaging ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            rangeLabel={`${labels[rangeStart]} – ${labels[rangeEnd]}`}
            onChange={setPage}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{labels.length}</span> números
          </span>
        )}
        <BulkFillButton
          labels={labels}
          salePointId={salePointId}
          gameId={game.id}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        </div>
      ) : game.type === 'date' ? (
        <DateTable
          salePointId={salePointId}
          gameId={game.id}
          labels={labels}
          limitsByLabel={limitsByLabel}
          salesByLabel={salesByLabel}
        />
      ) : (
        <div className="overflow-x-auto">
          <NumberTable
            labels={visible}
            salePointId={salePointId}
            gameId={game.id}
            limitsByLabel={limitsByLabel}
            salesByLabel={salesByLabel}
          />
        </div>
      )}

      {needsPaging && (
        <Pagination
          page={page}
          totalPages={totalPages}
          rangeLabel={`${labels[rangeStart]} – ${labels[rangeEnd]}`}
          onChange={setPage}
        />
      )}
    </div>
  );
}

// ─── Shared table header ──────────────────────────────────────────────────────

function TableHead() {
  return (
    <thead>
      <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
        <th className="pb-2 pr-4 font-semibold">Apuesta</th>
        <th className="pb-2 pr-4 text-right font-semibold">Monto actual</th>
        <th className="pb-2 pr-3 text-right font-semibold">Monto máximo</th>
        <th className="pb-2 text-right font-semibold">Monto mín</th>
      </tr>
    </thead>
  );
}

// ─── NumberTable ──────────────────────────────────────────────────────────────

function NumberTable({
  labels,
  salePointId,
  gameId,
  limitsByLabel,
  salesByLabel,
}: {
  labels: string[];
  salePointId: string;
  gameId: string;
  limitsByLabel: Map<string, SaleLimitByNumber>;
  salesByLabel: Map<string, number>;
}) {
  return (
    <table className="w-full text-sm">
      <TableHead />
      <tbody>
        {labels.map((label) => (
          <NumberRow
            key={label}
            label={label}
            salePointId={salePointId}
            gameId={gameId}
            existing={limitsByLabel.get(label)}
            soldToday={salesByLabel.get(label) ?? 0}
          />
        ))}
      </tbody>
    </table>
  );
}

// ─── DateTable ────────────────────────────────────────────────────────────────

function DateTable({
  salePointId,
  gameId,
  labels,
  limitsByLabel,
  salesByLabel,
}: {
  salePointId: string;
  gameId: string;
  labels: string[];
  limitsByLabel: Map<string, SaleLimitByNumber>;
  salesByLabel: Map<string, number>;
}) {
  const byMonth = useMemo(() => {
    const groups: string[][] = Array.from({ length: 12 }, () => []);
    for (const label of labels) {
      const monthAbbr = label.split(' ')[1];
      const idx = MONTHS_ABBR.indexOf(monthAbbr as typeof MONTHS_ABBR[number]);
      if (idx >= 0) groups[idx].push(label);
    }
    return groups;
  }, [labels]);

  return (
    <div className="overflow-x-auto space-y-5">
      {byMonth.map((monthLabels, mi) =>
        monthLabels.length === 0 ? null : (
          <div key={mi}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {MONTHS_FULL[mi]}
            </h3>
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                {monthLabels.map((label) => (
                  <NumberRow
                    key={label}
                    label={label}
                    salePointId={salePointId}
                    gameId={gameId}
                    existing={limitsByLabel.get(label)}
                    soldToday={salesByLabel.get(label) ?? 0}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </div>
  );
}

// ─── NumberRow ────────────────────────────────────────────────────────────────

type CellStatus = 'idle' | 'saving' | 'saved';

function NumberRow({
  label,
  salePointId,
  gameId,
  existing,
  soldToday,
}: {
  label: string;
  salePointId: string;
  gameId: string;
  existing: SaleLimitByNumber | undefined;
  soldToday: number;
}) {
  const [draftMax, setDraftMax] = useState(existing ? String(existing.amount) : '');
  const [draftMin, setDraftMin] = useState(
    existing?.minAmount != null ? String(existing.minAmount) : '',
  );
  const [status, setStatus] = useState<CellStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftMaxRef = useRef(draftMax);
  const draftMinRef = useRef(draftMin);
  draftMaxRef.current = draftMax;
  draftMinRef.current = draftMin;

  const upsert = useUpsertSaleLimitByNumber();
  const remove = useDeleteSaleLimitByNumber(salePointId);

  useEffect(() => {
    if (status === 'idle') {
      setDraftMax(existing ? String(existing.amount) : '');
      setDraftMin(existing?.minAmount != null ? String(existing.minAmount) : '');
    }
  }, [existing, status]);

  useEffect(() => {
    if (status !== 'saved') return;
    timerRef.current = setTimeout(() => setStatus('idle'), 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  const persist = useCallback(async () => {
    const maxStr = draftMaxRef.current.trim();
    const minStr = draftMinRef.current.trim();
    const prevMax = existing ? String(existing.amount) : '';
    const prevMin = existing?.minAmount != null ? String(existing.minAmount) : '';

    if (maxStr === prevMax && minStr === prevMin) return;

    if (maxStr === '') {
      if (!existing) return;
      setStatus('saving');
      try {
        await remove.mutateAsync(existing.id);
        setStatus('saved');
      } catch {
        setStatus('idle');
      }
      return;
    }

    const numMax = Number(maxStr);
    if (!Number.isInteger(numMax) || numMax <= 0) { setDraftMax(prevMax); return; }

    const numMin = minStr === '' ? null : Number(minStr);
    if (numMin !== null && (!Number.isInteger(numMin) || numMin <= 0)) {
      setDraftMin(prevMin);
      return;
    }

    setStatus('saving');
    try {
      await upsert.mutateAsync({
        gameId,
        salePointId,
        label,
        amount: numMax,
        minAmount: numMin,
      });
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  }, [existing, gameId, salePointId, label, upsert, remove]);

  const hasMax = !!existing;
  const showMin = hasMax || draftMax.trim() !== '';

  // Color the sold amount when approaching the configured limit
  const pct = existing && soldToday > 0 ? soldToday / existing.amount : 0;
  const soldColor =
    pct >= 1
      ? 'text-red-600 font-semibold'
      : pct >= 0.8
        ? 'text-amber-600'
        : 'text-muted-foreground';

  return (
    <tr className="border-b border-border/50 last:border-0 transition-colors hover:bg-slate-50/40 dark:hover:bg-white/[0.02]">
      {/* Apuesta */}
      <td className="py-1.5 pr-4">
        <span
          className={cn(
            'font-mono text-sm font-bold',
            hasMax ? 'text-indigo-700 dark:text-indigo-400' : 'text-foreground',
          )}
        >
          {label}
        </span>
      </td>

      {/* Monto actual */}
      <td
        className={cn(
          'py-1.5 pr-4 text-right text-sm tabular-nums',
          soldToday > 0 ? soldColor : 'text-muted-foreground/30',
        )}
      >
        {soldToday > 0 ? formatCurrency(soldToday) : '—'}
      </td>

      {/* Monto máximo */}
      <td className="py-1.5 pr-3">
        <RowInput
          value={draftMax}
          onChange={setDraftMax}
          onBlur={persist}
          onReset={() => setDraftMax(existing ? String(existing.amount) : '')}
          status={status}
          hasValue={hasMax}
        />
      </td>

      {/* Monto mín */}
      <td className="py-1.5">
        {showMin ? (
          <RowInput
            value={draftMin}
            onChange={setDraftMin}
            onBlur={persist}
            onReset={() =>
              setDraftMin(
                existing?.minAmount != null ? String(existing.minAmount) : '',
              )
            }
            status="idle"
            hasValue={hasMax && existing?.minAmount != null}
            tone="emerald"
          />
        ) : (
          <span className="block text-right text-xs text-muted-foreground/20">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── RowInput ─────────────────────────────────────────────────────────────────

function RowInput({
  value,
  onChange,
  onBlur,
  onReset,
  status,
  hasValue,
  tone = 'indigo',
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onReset: () => void;
  status: CellStatus;
  hasValue: boolean;
  tone?: 'indigo' | 'emerald';
}) {
  const isIndigo = tone === 'indigo';
  return (
    <div className="relative flex justify-end">
      <div className="relative w-28">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') {
              onReset();
              e.currentTarget.blur();
            }
          }}
          placeholder="—"
          className={cn(
            'w-full rounded border bg-background py-0.5 pr-6 text-right text-xs tabular-nums',
            'placeholder:text-muted-foreground/40',
            'focus:outline-none focus:ring-1 focus:border-primary',
            isIndigo
              ? hasValue
                ? 'border-indigo-200 font-semibold text-indigo-900 focus:ring-indigo-300/40'
                : 'border-border text-foreground focus:ring-primary/30'
              : hasValue
                ? 'border-emerald-200 font-semibold text-emerald-900 focus:ring-emerald-300/40'
                : 'border-border text-foreground focus:ring-primary/30',
          )}
        />
        {status !== 'idle' && isIndigo && (
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
            {status === 'saving' ? (
              <Loader2 className="size-3 animate-spin text-primary" />
            ) : (
              <Check className="size-3 text-emerald-600" strokeWidth={3} />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── BulkFillButton ───────────────────────────────────────────────────────────

function BulkFillButton({
  labels,
  salePointId,
  gameId,
}: {
  labels: string[];
  salePointId: string;
  gameId: string;
}) {
  const upsert = useUpsertSaleLimitByNumber();

  const [open, setOpen] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [amount, setAmount] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const applying = progress !== null && progress.done < progress.total;

  const reset = () => {
    setDesde('');
    setHasta('');
    setAmount('');
    setProgress(null);
    setError('');
  };

  const handleClose = () => {
    if (applying) return;
    setOpen(false);
    reset();
  };

  const handleApply = async () => {
    setError('');
    const startIdx = labels.indexOf(desde.trim());
    const endIdx = labels.indexOf(hasta.trim());
    const numAmount = Number(amount.trim());

    if (startIdx === -1) { setError('Rango inferior no válido.'); return; }
    if (endIdx === -1) { setError('Rango superior no válido.'); return; }
    if (startIdx > endIdx) { setError('El rango inferior debe ser menor o igual al superior.'); return; }
    if (!Number.isInteger(numAmount) || numAmount <= 0) {
      setError('El monto debe ser un número entero positivo.');
      return;
    }

    const toApply = labels.slice(startIdx, endIdx + 1);
    setProgress({ done: 0, total: toApply.length });

    const CHUNK = 20;
    let done = 0;
    for (let i = 0; i < toApply.length; i += CHUNK) {
      const chunk = toApply.slice(i, i + CHUNK);
      await Promise.allSettled(
        chunk.map((label) =>
          upsert.mutateAsync({
            gameId,
            salePointId,
            label,
            amount: numAmount,
            minAmount: null,
          }),
        ),
      );
      done += chunk.length;
      setProgress({ done, total: toApply.length });
    }

    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
      >
        <Layers className="size-3.5" />
        Relleno masivo
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Relleno masivo"
        description="Aplicá un monto máximo a un rango de números de una sola vez."
        size="max-w-sm"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={applying}
              className="rounded-lg border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className="inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {progress!.done}/{progress!.total}
                </>
              ) : (
                'Aplicar'
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold text-muted-foreground">
                Rango inferior
              </span>
              <input
                type="text"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                placeholder={labels[0] ?? '00'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold text-muted-foreground">
                Rango superior
              </span>
              <input
                type="text"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                placeholder={labels[labels.length - 1] ?? '99'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted-foreground">
              Monto máximo
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="200"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  rangeLabel,
  onChange,
}: {
  page: number;
  totalPages: number;
  rangeLabel: string;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{rangeLabel}</span>
        {' · '}pág. {page + 1}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-4" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages - 1}
          className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center">
      <MapPin className="mx-auto size-8 text-muted-foreground/40" />
      <p className="mt-3 text-sm text-muted-foreground">
        Elegí una sucursal arriba para configurar sus límites de venta.
      </p>
    </div>
  );
}
