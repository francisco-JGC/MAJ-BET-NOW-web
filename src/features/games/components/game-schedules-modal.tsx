import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  useCreateSchedule,
  useDeleteSchedule,
  useGameSchedules,
  useUpdateSchedule,
} from '@/features/games/hooks/use-games';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';

import type { DrawSchedule, Game } from '@/features/games/types';

interface Props {
  game: Game | null;
  onClose: () => void;
}

/** Aligned with PG EXTRACT(DOW) — Sunday = 0. */
const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Sentinel identifying the not-yet-persisted new-row form. */
const NEW_ROW_ID = '__new__' as const;

type EditingId = string | typeof NEW_ROW_ID | null;

interface DraftForm {
  dayOfWeek: number | null;
  drawTime: string;
  cutoffMinutes: string;
  isActive: boolean;
}

const EMPTY_DRAFT: DraftForm = {
  dayOfWeek: null,
  drawTime: '',
  cutoffMinutes: '2',
  isActive: true,
};

function draftFromSchedule(s: DrawSchedule): DraftForm {
  return {
    dayOfWeek: s.dayOfWeek,
    drawTime: s.drawTime,
    cutoffMinutes: String(s.cutoffMinutes),
    isActive: s.isActive,
  };
}

export function GameSchedulesModal({ game, onClose }: Props) {
  const gameId = game?.id ?? '';
  const { data, isLoading, error } = useGameSchedules(game?.id ?? null);
  const create = useCreateSchedule(gameId);
  const update = useUpdateSchedule(gameId);
  const del = useDeleteSchedule(gameId);

  const [editing, setEditing] = useState<EditingId>(null);
  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset edit state whenever we switch to a different game (or reopen).
  useEffect(() => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setConfirmDeleteId(null);
  }, [gameId]);

  if (!game) return null;

  const startEdit = (schedule: DrawSchedule) => {
    setEditing(schedule.id);
    setDraft(draftFromSchedule(schedule));
    setConfirmDeleteId(null);
  };

  const startNew = () => {
    setEditing(NEW_ROW_ID);
    setDraft(EMPTY_DRAFT);
    setConfirmDeleteId(null);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  };

  const draftValid =
    HHMM_RE.test(draft.drawTime) &&
    draft.cutoffMinutes !== '' &&
    Number.isInteger(Number(draft.cutoffMinutes)) &&
    Number(draft.cutoffMinutes) >= 0 &&
    Number(draft.cutoffMinutes) <= 720;

  const submitNew = async () => {
    if (!draftValid) return;
    await create.mutateAsync({
      dayOfWeek: draft.dayOfWeek,
      drawTime: draft.drawTime,
      cutoffMinutes: Number(draft.cutoffMinutes),
    });
    cancel();
  };

  const submitEdit = async (id: string) => {
    if (!draftValid) return;
    await update.mutateAsync({
      id,
      payload: {
        dayOfWeek: draft.dayOfWeek,
        drawTime: draft.drawTime,
        cutoffMinutes: Number(draft.cutoffMinutes),
        isActive: draft.isActive,
      },
    });
    cancel();
  };

  const confirmDelete = async (id: string) => {
    await del.mutateAsync(id);
    setConfirmDeleteId(null);
  };

  const sorted = [...(data ?? [])].sort((a, b) => {
    // Daily (null) primero, luego por día, luego por hora.
    const da = a.dayOfWeek ?? -1;
    const db = b.dayOfWeek ?? -1;
    if (da !== db) return da - db;
    return a.drawTime.localeCompare(b.drawTime);
  });

  const isBusy = create.isPending || update.isPending || del.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Horarios · ${game.name}`}
      description="Cada horario se interpreta en zona América/Managua."
      size="max-w-3xl"
    >
      {isLoading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando horarios…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Día</th>
                  <th className="px-4 py-2.5">Hora</th>
                  <th className="px-4 py-2.5 text-right">Cutoff</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sorted.length === 0 && editing !== NEW_ROW_ID && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <CalendarClock className="size-7 text-muted-foreground/40" />
                        Este juego no tiene horarios configurados aún.
                      </div>
                    </td>
                  </tr>
                )}

                {sorted.map((s) =>
                  editing === s.id ? (
                    <EditRow
                      key={s.id}
                      draft={draft}
                      onChange={setDraft}
                      onCancel={cancel}
                      onSave={() => submitEdit(s.id)}
                      isValid={draftValid}
                      isPending={update.isPending}
                      showActiveToggle
                    />
                  ) : (
                    <ReadRow
                      key={s.id}
                      schedule={s}
                      onEdit={() => startEdit(s)}
                      onDelete={() => setConfirmDeleteId(s.id)}
                      confirmingDelete={confirmDeleteId === s.id}
                      onConfirmDelete={() => confirmDelete(s.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      deleting={del.isPending && del.variables === s.id}
                      disabled={
                        (isBusy && !(del.isPending && del.variables === s.id)) ||
                        editing !== null
                      }
                    />
                  ),
                )}

                {editing === NEW_ROW_ID && (
                  <EditRow
                    draft={draft}
                    onChange={setDraft}
                    onCancel={cancel}
                    onSave={submitNew}
                    isValid={draftValid}
                    isPending={create.isPending}
                  />
                )}
              </tbody>
            </table>
          </div>

          {editing === null && (
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-500/5"
            >
              <Plus className="size-4" strokeWidth={2.6} />
              Agregar horario
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function ReadRow({
  schedule,
  onEdit,
  onDelete,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  deleting,
  disabled,
}: {
  schedule: DrawSchedule;
  onEdit: () => void;
  onDelete: () => void;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  deleting: boolean;
  disabled: boolean;
}) {
  return (
    <tr className={cn(deleting && 'opacity-60')}>
      <td className="px-4 py-2.5">
        {schedule.dayOfWeek === null ? (
          <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            Todos los días
          </span>
        ) : (
          DAYS_OF_WEEK[schedule.dayOfWeek] ?? `Día ${schedule.dayOfWeek}`
        )}
      </td>
      <td className="px-4 py-2.5 font-mono text-foreground">
        {formatWallClock(schedule.drawTime)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
        {schedule.cutoffMinutes} min
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
            schedule.isActive
              ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
              : 'bg-slate-100 text-slate-600 ring-slate-200',
          )}
        >
          {schedule.isActive ? 'Activo' : 'Pausado'}
        </span>
      </td>
      <td className="px-4 py-2.5">
        {confirmingDelete ? (
          <div className="flex items-center justify-end gap-1.5 text-xs">
            <span className="text-muted-foreground">¿Eliminar?</span>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deleting}
              className={cn(
                'inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 font-semibold text-white hover:bg-rose-700',
                deleting && 'cursor-not-allowed opacity-60',
              )}
            >
              {deleting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" strokeWidth={2.6} />
              )}
              Sí
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              disabled={deleting}
              className="rounded-md px-2 py-1 font-semibold text-muted-foreground hover:bg-secondary"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onEdit}
              disabled={disabled}
              aria-label="Editar horario"
              title="Editar"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={disabled}
              aria-label="Eliminar horario"
              title="Eliminar"
              className="flex size-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function EditRow({
  draft,
  onChange,
  onCancel,
  onSave,
  isValid,
  isPending,
  showActiveToggle = false,
}: {
  draft: DraftForm;
  onChange: (next: DraftForm) => void;
  onCancel: () => void;
  onSave: () => void;
  isValid: boolean;
  isPending: boolean;
  showActiveToggle?: boolean;
}) {
  return (
    <tr className="bg-indigo-500/5">
      <td className="px-4 py-2.5">
        <select
          value={draft.dayOfWeek === null ? 'daily' : String(draft.dayOfWeek)}
          onChange={(e) =>
            onChange({
              ...draft,
              dayOfWeek:
                e.target.value === 'daily' ? null : Number(e.target.value),
            })
          }
          className={cellInputClass}
        >
          <option value="daily">Todos los días</option>
          {DAYS_OF_WEEK.map((label, idx) => (
            <option key={idx} value={idx}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <input
          type="time"
          value={draft.drawTime}
          onChange={(e) => onChange({ ...draft, drawTime: e.target.value })}
          className={cn(cellInputClass, 'font-mono')}
        />
      </td>
      <td className="px-4 py-2.5">
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={720}
            value={draft.cutoffMinutes}
            onChange={(e) =>
              onChange({ ...draft, cutoffMinutes: e.target.value })
            }
            className={cn(cellInputClass, 'pr-10 text-right tabular-nums')}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            min
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {showActiveToggle ? (
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) =>
                onChange({ ...draft, isActive: e.target.checked })
              }
              className="size-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span
              className={cn(
                'font-semibold',
                draft.isActive ? 'text-emerald-700' : 'text-slate-500',
              )}
            >
              {draft.isActive ? 'Activo' : 'Pausado'}
            </span>
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">Activo</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onSave}
            disabled={!isValid || isPending}
            aria-label="Guardar"
            title="Guardar"
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-md text-white',
              !isValid || isPending
                ? 'cursor-not-allowed bg-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" strokeWidth={2.6} />
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            aria-label="Cancelar"
            title="Cancelar"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

const cellInputClass =
  'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

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
