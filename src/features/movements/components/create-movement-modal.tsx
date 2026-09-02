import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  Gift,
  Loader2,
  Minus,
  Plus,
  Save,
  User,
  Wallet,
} from 'lucide-react';

import { useCreateMovement } from '@/features/movements/hooks/use-movements';
import { MovementType } from '@/features/movements/types';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserRole } from '@/features/users/types';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: MovementType;
  /** When provided, pre-selects this seller. */
  defaultSellerId?: string;
}

interface TypeOption {
  id: string;
  type: MovementType;
  label: string;
  icon: React.ReactNode;
  hint: string;
}

const SELLER_TYPE_OPTIONS: TypeOption[] = [
  {
    id: 'cobro',
    type: MovementType.DEPOSIT,
    label: 'Cobro',
    icon: <ArrowUpRight className="size-4 text-emerald-600" />,
    hint: 'Dinero recibido del vendedor',
  },
  {
    id: 'credito',
    type: MovementType.WITHDRAWAL,
    label: 'Crédito',
    icon: <Wallet className="size-4 text-blue-600" />,
    hint: 'Devolución al vendedor',
  },
  {
    id: 'ajuste_mas',
    type: MovementType.DEPOSIT,
    label: 'Ajuste +',
    icon: <Plus className="size-4 text-emerald-600" />,
    hint: 'Corrección que suma al balance',
  },
  {
    id: 'ajuste_menos',
    type: MovementType.WITHDRAWAL,
    label: 'Ajuste −',
    icon: <Minus className="size-4 text-rose-600" />,
    hint: 'Corrección que resta del balance',
  },
];

function defaultOptionId(defaultType?: MovementType): string {
  if (defaultType === MovementType.WITHDRAWAL) return 'credito';
  return 'cobro';
}

interface FormState {
  sellerId: string;
  selectedOptionId: string;
  amount: string;
  description: string;
  occurredDate: string;
  isPrizePayment: boolean;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EMPTY: FormState = {
  sellerId: '',
  selectedOptionId: 'cobro',
  amount: '',
  description: '',
  occurredDate: isoDate(new Date()),
  isPrizePayment: false,
};

export function CreateMovementModal({
  open,
  onClose,
  defaultType,
  defaultSellerId,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [clientRequestId, setClientRequestId] = useState<string>('');

  const { data: sellersData, isLoading: loadingSellers } = useUsers({
    role: UserRole.SELLER,
    limit: 200,
    offset: 0,
  });
  const { mutateAsync, isPending, error, reset } = useCreateMovement();

  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY,
        sellerId: defaultSellerId ?? '',
        selectedOptionId: defaultOptionId(defaultType),
      });
      reset();
    }
  }, [open, defaultType, defaultSellerId, reset]);

  useEffect(() => {
    if (open) setClientRequestId(crypto.randomUUID());
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedOption =
    SELLER_TYPE_OPTIONS.find((o) => o.id === form.selectedOptionId) ?? SELLER_TYPE_OPTIONS[0];

  const parsedAmount = parseInt(form.amount, 10);
  const amountValid =
    form.amount !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  const isValid = amountValid && form.sellerId.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;
    await mutateAsync({
      sellerId: form.sellerId,
      isPrizePayment: form.isPrizePayment,
      type: selectedOption.type,
      amount: parsedAmount,
      description: form.description.trim() || undefined,
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
      description="Los movimientos entran al cálculo según su tipo."
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
        <Field label="Vendedor" required>
          <Select
            value={form.sellerId}
            onChange={(v) => set('sellerId', v)}
            leadingIcon={<User className="size-4" />}
            placeholder={
              loadingSellers ? 'Cargando…' : 'Seleccione un vendedor'
            }
            disabled={loadingSellers}
            options={
              sellersData?.items.map((u) => ({
                value: u.id,
                label: u.name,
              })) ?? []
            }
          />
        </Field>

        <Field label="Tipo" required>
          <div className="grid gap-2 grid-cols-2">
            {SELLER_TYPE_OPTIONS.map((opt) => (
              <TypeOption
                key={opt.id}
                active={form.selectedOptionId === opt.id}
                onClick={() => set('selectedOptionId', opt.id)}
                icon={opt.icon}
                label={opt.label}
                hint={opt.hint || undefined}
              />
            ))}
          </div>
        </Field>

        {/* Prize payment checkbox */}
        <label className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-sm text-foreground cursor-pointer hover:bg-secondary/50 transition">
          <input
            type="checkbox"
            checked={form.isPrizePayment}
            onChange={(e) => set('isPrizePayment', e.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
          <Gift className="size-4 shrink-0 text-amber-500" strokeWidth={2.2} />
          <span className="font-medium">Pago de premio</span>
          <span className="text-muted-foreground text-xs">
            (marcar si este movimiento corresponde al pago de un premio ganado)
          </span>
        </label>

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
            placeholder="ej. Cobro semana 23, ajuste por diferencia en caja"
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
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition',
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-secondary/60',
      )}
    >
      <span>{icon}</span>
      <span className="text-xs font-bold text-foreground">{label}</span>
      {hint && (
        <span className="text-[10px] text-muted-foreground leading-tight">{hint}</span>
      )}
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
