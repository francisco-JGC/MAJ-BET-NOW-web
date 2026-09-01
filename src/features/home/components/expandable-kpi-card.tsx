import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import type { KpiDelta } from '@/features/home/components/kpi-card';
import type { GameBreakdownItem } from '@/features/home/types';

type Tone = 'emerald' | 'rose';

const TONE: Record<
  Tone,
  { bar: string; total: string; iconWrap: string; icon: string; ring: string; chip: string; expandBtn: string }
> = {
  emerald: {
    bar: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    total: 'text-emerald-700',
    iconWrap: 'bg-emerald-500/12',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-500/20',
    chip: 'bg-emerald-500/10',
    expandBtn: 'text-emerald-700 hover:bg-emerald-50',
  },
  rose: {
    bar: 'bg-gradient-to-r from-rose-400 to-rose-600',
    total: 'text-rose-700',
    iconWrap: 'bg-rose-500/12',
    icon: 'text-rose-600',
    ring: 'ring-rose-500/20',
    chip: 'bg-rose-500/10',
    expandBtn: 'text-rose-700 hover:bg-rose-50',
  },
};

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
  delta?: KpiDelta;
  /** Slice de byGame a mostrar (billed o won según la card). */
  breakdown: GameBreakdownItem[];
  /** Qué campo de GameBreakdownItem usar: 'billed' | 'won'. */
  breakdownKey: 'billed' | 'won';
}

export function ExpandableKpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  delta,
  breakdown,
  breakdownKey,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = TONE[tone];

  const total = breakdown.reduce((sum, g) => sum + g[breakdownKey], 0);
  const rows = [...breakdown].sort((a, b) => b[breakdownKey] - a[breakdownKey]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.18)]">
      {/* ── Main KPI row ── */}
      <div className="relative flex items-start justify-between gap-3 p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-4xl font-black leading-none tracking-tight">
            {value}
          </p>
          {(delta || hint) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {delta && <DeltaChip delta={delta} />}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
              t.iconWrap,
              t.ring,
            )}
          >
            <Icon className={cn('size-5', t.icon)} strokeWidth={2.4} />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition',
              t.expandBtn,
            )}
            aria-expanded={open}
          >
            {open ? 'Ocultar' : 'Por juego'}
            {open ? (
              <ChevronUp className="size-3.5" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="size-3.5" strokeWidth={2.5} />
            )}
          </button>
        </div>
        {/* ambient glow */}
        <div
          className={cn(
            'pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-40 blur-3xl',
            t.chip,
          )}
        />
      </div>

      {/* ── Breakdown rows (collapsible) ── */}
      {open && (
        <div className="border-t border-border/70">
          {rows.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Sin datos para este periodo.
            </p>
          )}
          {rows.map((g) => {
            const val = g[breakdownKey];
            const pct = total === 0 ? 0 : (val / total) * 100;
            return (
              <div key={g.gameId} className="px-6 py-4 [&+&]:border-t [&+&]:border-border/60">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {g.gameName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pct.toFixed(pct >= 10 ? 1 : 2)}%
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(val)}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', t.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {/* Total footer */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/70 px-6 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Total
              </span>
              <span className={cn('text-sm font-black tabular-nums', t.total)}>
                {formatCurrency(total)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaChip({ delta }: { delta: KpiDelta }) {
  if (delta.pct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
        <Minus className="size-3" strokeWidth={2.5} />
        Sin dato ayer
      </span>
    );
  }
  const isUp = delta.pct > 0;
  const isDown = delta.pct < 0;
  const isFlat = delta.pct === 0;
  const isGood = isFlat ? false : delta.positive === 'up' ? isUp : isDown;
  const arrowClass = isFlat
    ? 'text-slate-500'
    : isGood
      ? 'text-emerald-600'
      : 'text-rose-600';
  const chipClass = isFlat
    ? 'bg-slate-100 text-slate-600 ring-slate-200'
    : isGood
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
      : 'bg-rose-500/10 text-rose-700 ring-rose-500/20';
  const abs = Math.abs(delta.pct);
  const formatted = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        chipClass,
      )}
    >
      {isFlat ? (
        <Minus className={cn('size-3', arrowClass)} strokeWidth={2.5} />
      ) : isUp ? (
        <ArrowUpRight className={cn('size-3', arrowClass)} strokeWidth={2.5} />
      ) : (
        <ArrowDownRight className={cn('size-3', arrowClass)} strokeWidth={2.5} />
      )}
      {formatted}%
      {delta.label && (
        <span className="font-normal opacity-80">{delta.label}</span>
      )}
    </span>
  );
}
