import type { LucideIcon } from 'lucide-react';

import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';

import type { RankingItem } from '@/features/home/types';

interface Props {
  title: string;
  emptyLabel: string;
  items: RankingItem[];
  icon: LucideIcon;
  /** Tone drives the progress-bar gradient. */
  tone: 'indigo' | 'emerald';
}

const TONE_BAR: Record<Props['tone'], string> = {
  indigo: 'bg-gradient-to-r from-indigo-400 to-indigo-600',
  emerald: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
};

const TONE_BADGE: Record<Props['tone'], string> = {
  indigo: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
};

export function TopRankingCard({
  title,
  emptyLabel,
  items,
  icon: Icon,
  tone,
}: Props) {
  const max = items.length === 0 ? 0 : items[0].amount;
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-center gap-2 border-b border-border/70 px-6 py-4">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      </header>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ol className="divide-y divide-border/60">
          {items.map((item, index) => (
            <li key={item.id} className="px-6 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-inset',
                      TONE_BADGE[tone],
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.ticketCount}{' '}
                      {item.ticketCount === 1 ? 'boleto' : 'boletos'}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    TONE_BAR[tone],
                  )}
                  style={{
                    width: `${max === 0 ? 0 : (item.amount / max) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
