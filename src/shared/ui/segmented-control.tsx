import { cn } from '@/shared/lib/cn';

export type SegmentTone = 'emerald' | 'rose' | 'amber' | 'neutral';

export interface SegmentTab<K extends string> {
  key: K;
  label: string;
  tone?: SegmentTone;
}

interface Props<K extends string> {
  tabs: readonly SegmentTab<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
}

const DOT: Record<SegmentTone, string> = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  neutral: 'bg-slate-400',
};

/**
 * Pill-style segmented control. Single source of truth for tab groups in the
 * dashboard so they always look identical. Pass an optional `tone` per tab
 * to render a color dot next to the label — useful when the tab represents a
 * series (Facturado / Pagado).
 */
export function SegmentedControl<K extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: Props<K>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-inset ring-slate-200/60"
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              'relative inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
              active
                ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_1px_1px_rgba(15,23,42,0.04)] ring-1 ring-black/5'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.tone && (
              <span
                aria-hidden
                className={cn(
                  'size-1.5 rounded-full transition-opacity',
                  DOT[tab.tone],
                  active ? 'opacity-100' : 'opacity-60',
                )}
              />
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
