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
 * Editable per-game limit row. Exposes two inputs:
 *  - "Máx. por sorteo": cumulative cap per number across all tickets
 *  - "Máx. por boleto": cap per individual ticket line for any number
 *
 * Save-on-blur, Enter to commit, Escape to cancel.
 * Clearing the "sorteo" input deletes the whole row (lifts the cap).
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
  const [draftAmount, setDraftAmount] = useState<string>(
    existing ? String(existing.amount) : '',
  );
  const [draftMaxPerTicket, setDraftMaxPerTicket] = useState<string>(
    existing?.maxPerTicket != null ? String(existing.maxPerTicket) : '',
  );
  const [status, setStatus] = useState<RowStatus>('idle');
  const savedTimer = useRef<number | null>(null);

  const upsert = useUpsertSaleLimit();
  const remove = useDeleteSaleLimit();

  useEffect(() => {
    if (status === 'idle') {
      setDraftAmount(existing ? String(existing.amount) : '');
      setDraftMaxPerTicket(
        existing?.maxPerTicket != null ? String(existing.maxPerTicket) : '',
      );
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
    const trimmedAmount = draftAmount.trim();
    const numericAmount = trimmedAmount === '' ? NaN : Number(trimmedAmount);
    const nextAmount =
      Number.isInteger(numericAmount) && numericAmount >= 0
        ? numericAmount
        : null;

    // Empty main amount → delete the row entirely
    if (trimmedAmount === '') {
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
      setDraftAmount(existing ? String(existing.amount) : '');
      return;
    }

    const trimmedMpt = draftMaxPerTicket.trim();
    const numericMpt = trimmedMpt === '' ? null : Number(trimmedMpt);
    const nextMpt: number | null =
      numericMpt === null ||
      (Number.isInteger(numericMpt) && numericMpt > 0)
        ? numericMpt
        : existing?.maxPerTicket ?? null;

    // Nothing changed
    if (
      existing &&
      nextAmount === existing.amount &&
      nextMpt === (existing.maxPerTicket ?? null)
    ) {
      return;
    }

    setStatus('saving');
    try {
      await upsert.mutateAsync({
        gameId,
        salePointId,
        amount: nextAmount,
        maxPerTicket: nextMpt,
      });
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  const isAmountDirty =
    (existing ? String(existing.amount) : '') !== draftAmount.trim();
  const isMptDirty =
    (existing?.maxPerTicket != null ? String(existing.maxPerTicket) : '') !==
    draftMaxPerTicket.trim();

  const inputClass = (dirty: boolean, hasValue: boolean) =>
    cn(
      'w-full rounded-md border bg-background py-1.5 text-right text-sm tabular-nums transition',
      'placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:text-xs',
      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasValue
        ? 'border-indigo-200 bg-indigo-50/50 font-semibold text-indigo-900'
        : 'border-border',
      dirty && status === 'idle' && 'border-purple-300 bg-purple-50/50',
    );

  return (
    <li className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50/40 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-500 text-white">
          <Dices className="size-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {gameName}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {existing
              ? `Sorteo: ${formatCurrency(existing.amount)}${existing.maxPerTicket != null ? ` · Boleto: ${formatCurrency(existing.maxPerTicket)}` : ''}`
              : 'Sin límite'}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2">
        {/* Max por sorteo */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Máx. por sorteo
          </span>
          <div className="relative w-32">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              C$
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              onBlur={persist}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                else if (e.key === 'Escape') {
                  setDraftAmount(existing ? String(existing.amount) : '');
                  e.currentTarget.blur();
                }
              }}
              placeholder="Sin límite"
              className={cn(inputClass(isAmountDirty, !!existing), 'pl-9 pr-2')}
            />
          </div>
        </div>

        {/* Max por boleto */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Máx. por boleto
          </span>
          <div className="relative w-32">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              C$
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={draftMaxPerTicket}
              onChange={(e) => setDraftMaxPerTicket(e.target.value)}
              onBlur={persist}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                else if (e.key === 'Escape') {
                  setDraftMaxPerTicket(
                    existing?.maxPerTicket != null
                      ? String(existing.maxPerTicket)
                      : '',
                  );
                  e.currentTarget.blur();
                }
              }}
              placeholder="Sin límite"
              className={cn(
                inputClass(isMptDirty, existing?.maxPerTicket != null),
                'pl-9 pr-2',
              )}
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="mb-0.5 flex size-7 shrink-0 items-center justify-center">
          {status !== 'idle' && (
            status === 'saving' ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Check className="size-4 text-emerald-600" strokeWidth={2.8} />
            )
          )}
        </div>
      </div>
    </li>
  );
}
