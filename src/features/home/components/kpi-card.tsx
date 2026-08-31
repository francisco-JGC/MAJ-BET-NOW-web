import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

type Tone = 'emerald' | 'rose' | 'amber' | 'indigo';

export interface KpiDelta {
  /** Signed percent change (e.g., 12.3 or -7.5). Null means "no baseline". */
  pct: number | null;
  /** `positive` = green chip, `negative` = red chip. Lets callers say
   *  "a drop in payouts is actually good" and flip the color. */
  positive: 'up' | 'down';
  label?: string;
}

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  hint?: string;
  delta?: KpiDelta;
}

const TONE: Record<
  Tone,
  { chip: string; iconWrap: string; icon: string; ring: string }
> = {
  emerald: {
    chip: 'bg-emerald-500/10',
    iconWrap: 'bg-emerald-500/12',
    icon: 'text-emerald-600',
    ring: 'ring-emerald-500/20',
  },
  rose: {
    chip: 'bg-rose-500/10',
    iconWrap: 'bg-rose-500/12',
    icon: 'text-rose-600',
    ring: 'ring-rose-500/20',
  },
  amber: {
    chip: 'bg-amber-500/10',
    iconWrap: 'bg-amber-500/15',
    icon: 'text-amber-600',
    ring: 'ring-amber-500/20',
  },
  indigo: {
    chip: 'bg-indigo-500/10',
    iconWrap: 'bg-indigo-500/12',
    icon: 'text-indigo-600',
    ring: 'ring-indigo-500/20',
  },
};

export function KpiCard({ label, value, icon: Icon, tone, hint, delta }: Props) {
  const t = TONE[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight">
            {value}
          </p>
          {(delta || hint) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {delta && <DeltaChip delta={delta} />}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            t.iconWrap,
            t.ring,
          )}
        >
          <Icon className={cn('size-5', t.icon)} strokeWidth={2.4} />
        </div>
      </div>
      <div
        className={cn(
          'pointer-events-none absolute -right-8 -top-8 size-32 rounded-full opacity-40 blur-3xl',
          t.chip,
        )}
      />
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
  const isGood = isFlat
    ? false
    : delta.positive === 'up'
      ? isUp
      : isDown;
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
