import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CalendarClock,
  Check,
  Dices,
  Loader2,
  Save,
  Trash2,
  Trophy,
} from 'lucide-react';

import {
  useCreateDrawResult,
  useDeleteDrawResult,
  useDrawResults,
  useUpdateDrawResult,
} from '@/features/draw-results/hooks/use-draw-results';
import { useGames, useGameSchedules } from '@/features/games/hooks/use-games';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import type { DrawResult } from '@/features/draw-results/types';
import type { GameType } from '@/features/games/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Existing result → EDIT mode (only number editable, delete available). */
  existing?: DrawResult | null;
}

function isoToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses ISO drawAt into local date+time components for pre-filling. */
function splitIsoDrawAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date: `${y}-${mo}-${day}`, time: `${hh}:${mm}` };
}

const NUMBER_HINT: Record<GameType, string> = {
  regular: 'Ej. 05',
  date: 'Ej. 13/02 o 13-feb',
  three_digit: 'Ej. 234',
  four_digit: 'Ej. 4589',
  multi_sorteo: 'Ej. 12',
};

export function RegisterResultModal({ open, onClose, existing }: Props) {
  const isEdit = existing != null;

  const [gameId, setGameId] = useState<string>('');
  const [date, setDate] = useState<string>(isoToday());
  const [time, setTime] = useState<string>('');
  const [winningNumber, setWinningNumber] = useState<string>('');

  const { data: games } = useGames();
  const { data: schedules } = useGameSchedules(
    !isEdit && gameId ? gameId : null,
  );
  // Existing results for the same game + day, to mark schedules that are
  // already registered so the admin doesn't try to insert a duplicate.
  const shouldFetchExisting = !isEdit && gameId !== '' && date !== '';
  const { data: existingResultsToday } = useDrawResults(
    {
      gameId: gameId || undefined,
      // Wall-clock day boundaries in Managua (UTC-6, no DST).
      from: date ? `${date}T00:00:00-06:00` : undefined,
      to: date ? `${date}T23:59:59-06:00` : undefined,
    },
    { enabled: shouldFetchExisting },
  );
  const create = useCreateDrawResult();
  const update = useUpdateDrawResult();
  const del = useDeleteDrawResult();

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset every time the modal opens (or the target `existing` changes).
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (existing) {
      const { date: d, time: t } = splitIsoDrawAt(existing.drawAt);
      setGameId(existing.gameId);
      setDate(d);
      setTime(t);
      setWinningNumber(existing.winningNumber);
    } else {
      setGameId('');
      setDate(isoToday());
      setTime('');
      setWinningNumber('');
    }
  }, [open, existing]);

  const selectedGame = useMemo(
    () => games?.find((g) => g.id === gameId) ?? null,
    [games, gameId],
  );

  // For CREATE mode, filter schedules by the selected date's day of week.
  const availableSchedules = useMemo(() => {
    if (isEdit || !schedules || !date) return [];
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    return schedules
      .filter((s) => s.isActive)
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === dow)
      .sort((a, b) => a.drawTime.localeCompare(b.drawTime));
  }, [isEdit, schedules, date]);

  // Map "HH:MM" (Managua wall-clock) → existing result at that draw time.
  const resultByTime = useMemo(() => {
    const map = new Map<string, DrawResult>();
    for (const r of existingResultsToday ?? []) {
      map.set(managuaHHMM(r.drawAt), r);
    }
    return map;
  }, [existingResultsToday]);

  const canSubmit =
    winningNumber.trim().length > 0 &&
    (isEdit || (gameId !== '' && date !== '' && time !== ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (isEdit && existing) {
      await update.mutateAsync({
        id: existing.id,
        payload: { winningNumber: winningNumber.trim() },
      });
      onClose();
      return;
    }

    // Nicaragua = UTC-6, sin DST. Interpretar "date + time" como wall-clock
    // Managua y mandar el instante UTC absoluto al backend.
    const drawAt = new Date(`${date}T${time}:00-06:00`).toISOString();
    await create.mutateAsync({
      gameId,
      drawAt,
      winningNumber: winningNumber.trim(),
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!existing) return;
    await del.mutateAsync(existing.id);
    onClose();
  };

  const isPending = create.isPending || update.isPending || del.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar resultado' : 'Registrar resultado'}
      description={
        isEdit
          ? 'Solo puedes modificar el número ganador.'
          : 'Elige el sorteo y captura el número ganador.'
      }
      size="max-w-xl"
      footer={
        <>
          {isEdit && (
            <>
              {confirmDelete ? (
                <div className="mr-auto flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    ¿Eliminar este resultado?
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700',
                      isPending && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {del.isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" strokeWidth={2.6} />
                    )}
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}
                    className="rounded-md px-2 py-1 font-semibold text-muted-foreground hover:bg-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2 className="size-4" strokeWidth={2.4} />
                  Eliminar
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="register-result-form"
            disabled={!canSubmit || isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition',
              !canSubmit || isPending
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-primary/90',
            )}
          >
            {isPending && !del.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" strokeWidth={2.4} />
            )}
            {isEdit ? 'Guardar cambios' : 'Registrar'}
          </button>
        </>
      }
    >
      <form
        id="register-result-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <Field label="Juego" required>
          <Select
            leadingIcon={<Dices className="size-4" />}
            value={gameId}
            onChange={(v) => {
              setGameId(v);
              setTime('');
            }}
            disabled={isEdit}
            placeholder="Seleccione un juego"
            ariaLabel="Juego"
            options={
              games
                ?.filter((g) => g.isActive || g.id === gameId)
                .map((g) => ({ value: g.id, label: g.name })) ?? []
            }
          />
        </Field>

        <Field label="Fecha" required>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime('');
              }}
              disabled={isEdit}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </Field>

        <Field label="Sorteo" required>
          <SchedulePicker
            isEdit={isEdit}
            existingIso={existing?.drawAt}
            gameSelected={gameId !== ''}
            schedules={availableSchedules}
            resultByTime={resultByTime}
            value={time}
            onChange={setTime}
          />
        </Field>

        <Field
          label="Número ganador"
          required
          hint={
            selectedGame
              ? NUMBER_HINT[selectedGame.type]
              : 'Depende del tipo de juego'
          }
        >
          <div className="relative">
            <Trophy className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-500" />
            <input
              type="text"
              value={winningNumber}
              onChange={(e) => setWinningNumber(e.target.value)}
              maxLength={20}
              autoFocus={isEdit}
              placeholder="000"
              className={cn(
                inputClass,
                'pl-9 pr-3 font-mono text-lg tracking-widest',
              )}
            />
          </div>
        </Field>

        {(create.error || update.error || del.error) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {(create.error || update.error || del.error)?.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

function SchedulePicker({
  isEdit,
  existingIso,
  gameSelected,
  schedules,
  resultByTime,
  value,
  onChange,
}: {
  isEdit: boolean;
  existingIso?: string;
  gameSelected: boolean;
  schedules: { id: string; drawTime: string }[];
  resultByTime: Map<string, DrawResult>;
  value: string;
  onChange: (time: string) => void;
}) {
  if (isEdit && existingIso) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-slate-50/70 px-3 py-2 text-sm text-muted-foreground">
        <CalendarClock className="size-4" />
        {new Intl.DateTimeFormat('es', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date(existingIso))}
      </div>
    );
  }

  if (!gameSelected) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-3 py-2.5 text-sm text-muted-foreground/80">
        Elige un juego primero
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-3 py-2.5 text-sm text-muted-foreground/80">
        No hay sorteos programados para este día.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {schedules.map((s) => {
        const active = value === s.drawTime;
        const existing = resultByTime.get(s.drawTime);
        const registered = existing != null;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => !registered && onChange(s.drawTime)}
            disabled={registered}
            title={
              registered
                ? `Ya registrado (${existing!.winningNumber})`
                : undefined
            }
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              registered
                ? 'cursor-not-allowed border border-emerald-500/25 bg-emerald-500/5 text-emerald-700'
                : active
                  ? 'bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_rgba(0,0,0,0.15)]'
                  : 'border border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary/60',
            )}
          >
            {registered ? (
              <Check className="size-3.5 text-emerald-600" strokeWidth={2.6} />
            ) : (
              <CalendarClock
                className={cn(
                  'size-3.5',
                  active
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground',
                )}
                strokeWidth={2.4}
              />
            )}
            <span>{formatWallClock(s.drawTime)}</span>
            {registered && (
              <span className="ml-1 rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-black text-white">
                {existing!.winningNumber}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  );
}

/**
 * Wall-clock "HH:MM" (24h) from an ISO datetime interpreted in Managua.
 * Uses `en-GB` so hours are always 00-23 (avoids the `en-US` midnight=24 quirk).
 */
function managuaHHMM(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Managua',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function formatWallClock(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${m
    .toString()
    .padStart(2, '0')} ${suffix}`;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';
