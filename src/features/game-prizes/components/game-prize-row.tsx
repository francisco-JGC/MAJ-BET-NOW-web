import { useEffect, useRef, useState } from 'react';
import { Check, Dices, Loader2, RotateCcw } from 'lucide-react';

import { useUpsertGamePrize } from '@/features/game-prizes/hooks/use-game-prizes';
import { cn } from '@/shared/lib/cn';

import type { EffectiveGamePrize } from '@/features/game-prizes/types';

type RowStatus = 'idle' | 'saving' | 'saved';

/**
 * Editable multipliers (exact + easy + pair-easy) for one game at one
 * sucursal. Inputs come pre-filled with the current effective value
 * (override or default). If the resulting value equals the game default,
 * we send `null` to the server which drops the override row and returns
 * to inheriting the default.
 *
 * The "Par" field only shows for games with a pair-easy default configured
 * — currently just Juega 3. Games without an easy default (Diaria, Fechas,
 * Tica) skip both the easy and pair-easy fields.
 *
 * Save-on-blur, Enter to commit, Escape to snap back.
 */
export function GamePrizeRow({
  salePointId,
  prize,
}: {
  salePointId: string;
  prize: EffectiveGamePrize;
}) {
  const initialExact =
    prize.exactMultiplier !== null ? String(prize.exactMultiplier) : '';
  const initialEasy =
    prize.easyMultiplier !== null ? String(prize.easyMultiplier) : '';
  const initialPair =
    prize.pairEasyMultiplier !== null ? String(prize.pairEasyMultiplier) : '';

  const [exactDraft, setExactDraft] = useState<string>(initialExact);
  const [easyDraft, setEasyDraft] = useState<string>(initialEasy);
  const [pairDraft, setPairDraft] = useState<string>(initialPair);
  const [status, setStatus] = useState<RowStatus>('idle');
  const savedTimer = useRef<number | null>(null);

  const upsert = useUpsertGamePrize();

  useEffect(() => {
    if (status === 'idle') {
      setExactDraft(initialExact);
      setEasyDraft(initialEasy);
      setPairDraft(initialPair);
    }
    // We intentionally depend on the derived strings so a background refetch
    // that lands on the same values doesn't trigger a rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialExact, initialEasy, initialPair, status]);

  useEffect(() => {
    if (status !== 'saved') return;
    savedTimer.current = window.setTimeout(() => setStatus('idle'), 1500);
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, [status]);

  const parseField = (raw: string): number | null | 'invalid' => {
    const t = raw.trim();
    if (t === '') return null;
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0) return 'invalid';
    return n;
  };

  /**
   * Turn the raw draft into the payload value for the API:
   * - Invalid input → 'invalid' (caller snaps back).
   * - Empty OR equal to game default → null (deletes the override).
   * - Anything else → the parsed integer (saves as override).
   */
  const toPayload = (
    raw: string,
    gameDefault: number | null,
  ): number | null | 'invalid' => {
    const parsed = parseField(raw);
    if (parsed === 'invalid') return 'invalid';
    if (parsed === null) return null;
    if (parsed === gameDefault) return null;
    return parsed;
  };

  const persist = async () => {
    const nextExact = toPayload(exactDraft, prize.exactDefault);
    const nextEasy = toPayload(easyDraft, prize.easyDefault);
    const nextPair = toPayload(pairDraft, prize.pairEasyDefault);

    if (nextExact === 'invalid') {
      setExactDraft(initialExact);
      return;
    }
    if (nextEasy === 'invalid') {
      setEasyDraft(initialEasy);
      return;
    }
    if (nextPair === 'invalid') {
      setPairDraft(initialPair);
      return;
    }

    // No-op: no override changed.
    if (
      nextExact === prize.overrideExact &&
      nextEasy === prize.overrideEasy &&
      nextPair === prize.overridePairEasy
    ) {
      return;
    }

    setStatus('saving');
    try {
      await upsert.mutateAsync({
        salePointId,
        gameId: prize.gameId,
        exactMultiplier: nextExact,
        easyMultiplier: nextEasy,
        pairEasyMultiplier: nextPair,
      });
      setStatus('saved');
    } catch {
      setStatus('idle');
    }
  };

  const exactDirty = exactDraft.trim() !== initialExact;
  const easyDirty = easyDraft.trim() !== initialEasy;
  const pairDirty = pairDraft.trim() !== initialPair;
  const anyDirty = exactDirty || easyDirty || pairDirty;

  const resetToDefaults = () => {
    setExactDraft(
      prize.exactDefault !== null ? String(prize.exactDefault) : '',
    );
    setEasyDraft(
      prize.easyDefault !== null ? String(prize.easyDefault) : '',
    );
    setPairDraft(
      prize.pairEasyDefault !== null ? String(prize.pairEasyDefault) : '',
    );
    // Let the blur cascade handle the persist so we keep a single write path.
    // Trigger it manually since state updates are batched.
    setTimeout(persist, 0);
  };

  // Games without an easy default (Diaria, Fechas, Tica, etc.) don't show
  // the second input — one less field for the operator to look past.
  const showEasy = prize.easyDefault !== null;
  // El campo "Par" se muestra si el juego tiene default configurado O si
  // la sucursal ya tiene un override. Es config-driven — antes se
  // hardcodeaba `slug === 'juega3'` pero eso rompía si el slug de la DB
  // difería (`juega-3`, etc.); admin no podía ver ni configurar el campo,
  // y todos los fácil pagaban precio regular aunque el ganador tuviera
  // pareja. Config del juego = signal autoritativo.
  const showPair =
    prize.pairEasyDefault !== null || prize.overridePairEasy !== null;

  const statusBadge =
    status !== 'idle'
      ? status === 'saving'
        ? <Loader2 className="size-4 animate-spin text-primary" />
        : <Check className="size-4 text-emerald-600" strokeWidth={2.8} />
      : null;

  const columnCount = 1 + 1 + (showEasy ? 1 : 0) + (showPair ? 1 : 0);
  const gridTemplate =
    columnCount === 4
      ? 'grid-cols-[1fr_auto_auto_auto]'
      : columnCount === 3
        ? 'grid-cols-[1fr_auto_auto]'
        : 'grid-cols-[1fr_auto]';

  return (
    <li
      className={cn(
        'grid items-center gap-3 px-4 py-2.5 hover:bg-slate-50/40',
        gridTemplate,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <Dices className="size-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {prize.gameName}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              Default: {prize.exactDefault ?? '—'}x
              {prize.easyDefault !== null && ` / ${prize.easyDefault}x`}
              {prize.pairEasyDefault !== null &&
                ` / ${prize.pairEasyDefault}x par`}
            </span>
            {prize.hasOverride && (
              <button
                type="button"
                onClick={resetToDefaults}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20 hover:bg-indigo-500/20"
                title="Restaurar al default del juego"
              >
                <RotateCcw className="size-3" strokeWidth={2.4} />
                Restaurar default
              </button>
            )}
          </div>
        </div>
      </div>

      <PrizeField
        label="Exacta"
        draft={exactDraft}
        setDraft={setExactDraft}
        placeholder={prize.exactDefault !== null ? String(prize.exactDefault) : '—'}
        dirty={exactDirty}
        overridden={prize.overrideExact !== null}
        onBlur={persist}
        rightBadge={!showEasy && !showPair ? statusBadge : undefined}
      />
      {showEasy && (
        <PrizeField
          label="Fácil"
          draft={easyDraft}
          setDraft={setEasyDraft}
          placeholder={String(prize.easyDefault)}
          dirty={easyDirty}
          overridden={prize.overrideEasy !== null}
          onBlur={persist}
          rightBadge={!showPair ? statusBadge : undefined}
        />
      )}
      {showPair && (
        <PrizeField
          label="Par"
          draft={pairDraft}
          setDraft={setPairDraft}
          placeholder={
            prize.pairEasyDefault !== null
              ? String(prize.pairEasyDefault)
              : 'sin regla'
          }
          dirty={pairDirty}
          overridden={prize.overridePairEasy !== null}
          onBlur={persist}
          rightBadge={statusBadge}
        />
      )}

      {anyDirty && status === 'idle' && (
        <span
          className={cn(
            '-mt-1.5 pl-11 text-[10px] text-amber-700',
            columnCount === 4
              ? 'col-span-4'
              : columnCount === 3
                ? 'col-span-3'
                : 'col-span-2',
          )}
        >
          Sin guardar
        </span>
      )}
    </li>
  );
}

function PrizeField({
  label,
  draft,
  setDraft,
  placeholder,
  dirty,
  overridden,
  onBlur,
  rightBadge,
}: {
  label: string;
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
  dirty: boolean;
  overridden: boolean;
  onBlur: () => void;
  rightBadge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative w-28">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border bg-background pr-8 py-1.5 pl-2 text-right text-sm tabular-nums transition',
            'placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:text-xs',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            overridden
              ? 'border-indigo-200 bg-indigo-50/50 font-semibold text-indigo-900'
              : 'border-border',
            dirty && 'border-amber-300 bg-amber-50/50',
          )}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">
          {rightBadge ?? 'x'}
        </span>
      </div>
    </div>
  );
}
