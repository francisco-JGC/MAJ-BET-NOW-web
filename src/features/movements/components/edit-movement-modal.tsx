import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';

import { useUpdateMovement } from '@/features/movements/hooks/use-movements';
import { MovementType } from '@/features/movements/types';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import type { Movement } from '@/features/movements/types';

interface Props {
  open: boolean;
  onClose: () => void;
  movement: Movement | null;
}

const TYPE_OPTIONS = [
  { value: MovementType.EXPENSE, label: 'Gasto' },
  { value: MovementType.DEPOSIT, label: 'Depósito / Cobro' },
  { value: MovementType.WITHDRAWAL, label: 'Retiro / Crédito' },
  { value: MovementType.ADJUSTMENT, label: 'Ajuste' },
];

interface FormState {
  type: MovementType;
  amount: string;
  description: string;
}

export function EditMovementModal({ open, onClose, movement }: Props) {
  const [form, setForm] = useState<FormState>({
    type: MovementType.DEPOSIT,
    amount: '',
    description: '',
  });

  const { mutateAsync, isPending, error, reset } = useUpdateMovement();

  useEffect(() => {
    if (open && movement) {
      setForm({
        type: movement.type,
        amount: String(movement.amount),
        description: movement.description ?? '',
      });
      reset();
    }
  }, [open, movement, reset]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parsedAmount = parseInt(form.amount, 10);
  const amountValid =
    form.amount !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValid || isPending || !movement) return;
    await mutateAsync({
      id: movement.id,
      payload: {
        type: form.type,
        amount: parsedAmount,
        description: form.description.trim() || undefined,
      },
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar movimiento"
      size="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-movement-form"
            disabled={!amountValid || isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition',
              !amountValid || isPending
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-primary/90',
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" strokeWidth={2.4} />
            )}
            Guardar cambios
          </button>
        </>
      }
    >
      <form id="edit-movement-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Tipo" required>
          <Select
            value={form.type}
            onChange={(v) => set('type', v as MovementType)}
            options={TYPE_OPTIONS}
          />
        </Field>

        <Field
          label="Monto"
          hint="En córdobas — sin signo"
          required
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              C$
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              className={cn(inputClass, 'pl-9 tabular-nums')}
              autoFocus
            />
          </div>
        </Field>

        <Field label="Descripción">
          <input
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={255}
            placeholder="ej. Cobro semana 23"
            className={inputClass}
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60';

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
