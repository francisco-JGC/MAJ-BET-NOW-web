import { useMemo, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import {
  SegmentedControl,
  type SegmentTab,
} from '@/shared/ui/segmented-control';

import type { GameBreakdownItem } from '@/features/home/types';

type Mode = 'billed' | 'won';

const MODE_STYLE: Record<
  Mode,
  { label: string; bar: string; total: string }
> = {
  billed: {
    label: 'Facturado por juegos',
    bar: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    total: 'text-emerald-700',
  },
  won: {
    label: 'Ganado por clientes',
    bar: 'bg-gradient-to-r from-rose-400 to-rose-600',
    total: 'text-rose-700',
  },
};

const TABS: readonly SegmentTab<Mode>[] = [
  { key: 'billed', label: 'Facturado por Juegos', tone: 'emerald' },
  { key: 'won', label: 'Ganado por clientes', tone: 'rose' },
] as const;

interface Props {
  items: GameBreakdownItem[];
}

export function GamesBreakdown({ items }: Props) {
  const [mode, setMode] = useState<Mode>('billed');

  const { total, rows } = useMemo(() => {
    const total = items.reduce(
      (sum, item) => sum + (mode === 'billed' ? item.billed : item.won),
      0,
    );
    const rows = items
      .map((item) => ({
        gameId: item.gameId,
        gameName: item.gameName,
        value: mode === 'billed' ? item.billed : item.won,
      }))
      // Show most relevant first, but keep zero rows so admin sees full catalog.
      .sort((a, b) => b.value - a.value);
    return { total, rows };
  }, [items, mode]);

  const style = MODE_STYLE[mode];

  return (
    <section className="space-y-3">
      <SegmentedControl
        ariaLabel="Breakdown por juego"
        tabs={TABS}
        value={mode}
        onChange={setMode}
      />

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <header className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <h3 className="text-lg font-bold tracking-tight">{style.label}</h3>
          <span className={cn('text-lg font-black', style.total)}>
            {formatCurrency(total)}
          </span>
        </header>

        <div className="divide-y divide-border/60">
          {rows.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Sin datos para este periodo.
            </div>
          )}
          {rows.map((row) => (
            <BreakdownRow
              key={row.gameId}
              name={row.gameName}
              value={row.value}
              total={total}
              barClass={style.bar}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function BreakdownRow({
  name,
  value,
  total,
  barClass,
}: {
  name: string;
  value: number;
  total: number;
  barClass: string;
}) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div className="px-6 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="text-xs text-muted-foreground">
            {pct.toFixed(pct >= 10 ? 1 : 2)}%
          </p>
        </div>
        <p className="text-sm font-bold tabular-nums text-foreground">
          {formatCurrency(value)}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

