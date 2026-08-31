import { useEffect, useRef, useState } from 'react';
import { Check, Dices, Loader2 } from 'lucide-react';

import {
  useDeleteSaleLimit,
  useUpsertSaleLimit,
} from '@/features/sale-limits/hooks/use-sale-limits';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';

import type { SaleLimit } from '@/features/sale-limits/types';

type RowStatus = 'idle' | 'saving' | 'saved';

/**
 * Editable per-game limit row shared between the standalone /limites-venta
 * page and the sucursal details modal. Save-on-blur, Enter to commit,
 * Escape to cancel, clearing to empty deletes the row (lifts the cap).
 */
export function LimitRow({
  gameId,
  gameName,
  salePointId,
  existing,
}: {
  gameId: string;
  gameName: string;
  salePointId: string;
  existing: SaleLimit | undefined;
}) {
  const [draft, setDraft] = useState<string>(
    existing ? String(existing.amount) : '',
  );
  const [status, setStatus] = useState<RowStatus>('idle');
  const savedTimer = useRef<number | null>(null);

  const upsert = useUpsertSaleLimit();
  const remove = useDeleteSaleLimit();

  useEffect(() => {
    // Sync from server only when idle — don't clobber the user's typing
    // during a background refetch.
    if (status === 'idle') {
      setDraft(existing ? String(existing.amount) : '');
    }
  }, [existing, status]);

  useEffect(() => {
    if (status !== 'saved') return;
    savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, [status]);

  const persist = async () => {
    const trimmed = draft.trim();
    const numeric = trimmed === '' ? NaN : Number(trimmed);
    const nextAmount =
      Number.isInteger(numeric) && numeric >= 0 ? numeric : null;

    if (trimmed === '') {
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

    if (nextAmount === null) {
      setDraft(existing ? String(existing.amount) : '');
      return;
    }

    if (existing && nextAmount === existing.amount) return;

    setStatus('saving');
    try {
      await upsert.mutateAsync({ gameId, salePointId, amount: nextAmount });
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  const isDirty =
    (existing ? String(existing.amount) : '') !== draft.trim();

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-slate-50/40">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <Dices className="size-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {gameName}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {existing ? `Actual: ${formatCurrency(existing.amount)}` : 'Sin límite'}
          </div>
        </div>
      </div>

      <div className="relative w-40 shrink-0">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          C$
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={persist}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setDraft(existing ? String(existing.amount) : '');
              e.currentTarget.blur();
            }
          }}
          placeholder="Sin límite"
          className={cn(
            'w-full rounded-md border bg-background pl-9 pr-8 py-1.5 text-right text-sm tabular-nums transition',
            'placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:text-xs',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            existing
              ? 'border-indigo-200 bg-indigo-50/50 font-semibold text-indigo-900'
              : 'border-border',
            isDirty && status === 'idle' && 'border-amber-300 bg-amber-50/50',
          )}
        />
        {status !== 'idle' && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            {status === 'saving' ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Check className="size-4 text-emerald-600" strokeWidth={2.8} />
            )}
          </span>
        )}
      </div>
    </li>
  );
}
