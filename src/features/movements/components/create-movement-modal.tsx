import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  DoorClosed,
  DoorOpen,
  Loader2,
  MapPin,
  Save,
  Scale,
  Wallet,
} from 'lucide-react';

import { useCreateMovement } from '@/features/movements/hooks/use-movements';
import { MovementType } from '@/features/movements/types';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-selects a sucursal when opened from a specific context. */
  defaultSalePointId?: string;
  /** Pre-selects a type when opened from Gastos, etc. */
  defaultType?: MovementType;
}

interface FormState {
  salePointId: string;
  type: MovementType;
  amount: string; // string so empty input is valid mid-typing
  description: string;
  occurredDate: string; // yyyy-mm-dd
}

const TYPE_OPTIONS: {
  value: MovementType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: MovementType.EXPENSE,
    label: 'Gasto',
    icon: <ArrowDownRight className="size-4 text-rose-600" />,
  },
  {
    value: MovementType.DEPOSIT,
    label: 'Depósito',
    icon: <ArrowUpRight className="size-4 text-emerald-600" />,
  },
  {
    value: MovementType.WITHDRAWAL,
    label: 'Retiro',
    icon: <Wallet className="size-4 text-rose-600" />,
  },
  {
    value: MovementType.OPENING,
    label: 'Apertura de caja',
    icon: <DoorOpen className="size-4 text-slate-600" />,
  },
  {
    value: MovementType.CLOSING,
    label: 'Cierre de caja',
    icon: <DoorClosed className="size-4 text-slate-600" />,
  },
  {
    value: MovementType.ADJUSTMENT,
    label: 'Ajuste',
    icon: <Scale className="size-4 text-slate-600" />,
  },
];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EMPTY: FormState = {
  salePointId: '',
  type: MovementType.EXPENSE,
  amount: '',
  description: '',
  occurredDate: isoDate(new Date()),
};

export function CreateMovementModal({
  open,
  onClose,
  defaultSalePointId,
  defaultType,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  // UUID de idempotencia — se genera UNA VEZ al abrir el modal y se
  // preserva durante toda su vida. Así, si la request falla y el
  // usuario tapea "Guardar" de nuevo, va el mismo id y el backend
  // dedupea. Al cerrar/abrir se regenera para que un movement NUEVO no
  // reuse el id de uno ya creado.
  const [clientRequestId, setClientRequestId] = useState<string>('');
  const { data: salePoints, isLoading: loadingSalePoints } = useSalePoints();
  const { mutateAsync, isPending, error, reset } = useCreateMovement();

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        salePointId: defaultSalePointId ?? '',
        type: defaultType ?? EMPTY.type,
      });
      reset();
    }
  }, [open, defaultSalePointId, defaultType, reset]);

  // Genera el UUID SOLO cuando `open` transiciona a true; no depende de
  // `defaultSalePointId`/`defaultType` para no rotarlo si el padre
  // cambia esos props mientras el modal está abierto (rompería el
  // dedupe de un retry en curso).
  useEffect(() => {
    if (open) setClientRequestId(crypto.randomUUID());
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parsedAmount = parseInt(form.amount, 10);
  const amountValid =
    form.amount !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0;
  const isValid = form.salePointId.length > 0 && amountValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;
    await mutateAsync({
      salePointId: form.salePointId,
      type: form.type,
      amount: parsedAmount,
      description: form.description.trim() || undefined,
      // Send as Managua wall-clock ISO — server just stores it.
      occurredAt: `${form.occurredDate}T00:00:00-06:00`,
      clientRequestId,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar movimiento"
      description="Los movimientos entran al cálculo diario según su tipo."
      size="max-w-xl"
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
            form="create-movement-form"
            disabled={!isValid || isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition',
              !isValid || isPending
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-primary/90',
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" strokeWidth={2.4} />
            )}
            Guardar
          </button>
        </>
      }
    >
      <form
        id="create-movement-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <Field label="Sucursal" required>
          <Select
            value={form.salePointId}
            onChange={(v) => set('salePointId', v)}
            leadingIcon={<MapPin className="size-4" />}
            placeholder={
              loadingSalePoints ? 'Cargando…' : 'Seleccione una sucursal'
            }
            disabled={loadingSalePoints}
            options={
              salePoints?.map((sp) => ({ value: sp.id, label: sp.name })) ?? []
            }
          />
        </Field>

        <Field label="Tipo" required>
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <TypeOption
                key={opt.value}
                active={form.type === opt.value}
                onClick={() => set('type', opt.value)}
                icon={opt.icon}
                label={opt.label}
              />
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Monto"
            hint="En córdobas — sin signo, el tipo define si suma o resta"
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

          <Field label="Fecha" required>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={form.occurredDate}
                onChange={(e) => set('occurredDate', e.target.value)}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
          </Field>
        </div>

        <Field label="Descripción">
          <input
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={255}
            placeholder="ej. Pago de luz, remesa desde bodega, ajuste caja"
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

function TypeOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2 text-left transition',
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-secondary/60',
      )}
    >
      <span>{icon}</span>
      <span className="text-xs font-bold text-foreground">{label}</span>
    </button>
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
