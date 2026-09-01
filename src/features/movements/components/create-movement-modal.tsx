import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  DoorClosed,
  DoorOpen,
  Gift,
  Loader2,
  MapPin,
  Save,
  Scale,
  User,
  Wallet,
} from 'lucide-react';

import { useCreateMovement } from '@/features/movements/hooks/use-movements';
import { MovementType } from '@/features/movements/types';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserRole } from '@/features/users/types';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultSalePointId?: string;
  defaultType?: MovementType;
  /** When provided, pre-selects seller mode with this seller. */
  defaultSellerId?: string;
}

type TargetMode = 'sucursal' | 'seller';

interface FormState {
  targetMode: TargetMode;
  salePointId: string;
  sellerId: string;
  type: MovementType;
  amount: string;
  description: string;
  occurredDate: string;
  isPrizePayment: boolean;
}

const SUCURSAL_TYPE_OPTIONS: {
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

const SELLER_TYPE_OPTIONS: {
  value: MovementType;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    value: MovementType.DEPOSIT,
    label: 'Cobro',
    icon: <ArrowUpRight className="size-4 text-emerald-600" />,
    hint: 'Dinero recibido del vendedor',
  },
  {
    value: MovementType.WITHDRAWAL,
    label: 'Crédito',
    icon: <Wallet className="size-4 text-blue-600" />,
    hint: 'Devolución o pago al vendedor',
  },
  {
    value: MovementType.ADJUSTMENT,
    label: 'Ajuste',
    icon: <Scale className="size-4 text-slate-600" />,
    hint: 'Corrección manual',
  },
];

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EMPTY: FormState = {
  targetMode: 'sucursal',
  salePointId: '',
  sellerId: '',
  type: MovementType.EXPENSE,
  amount: '',
  description: '',
  occurredDate: isoDate(new Date()),
  isPrizePayment: false,
};

export function CreateMovementModal({
  open,
  onClose,
  defaultSalePointId,
  defaultType,
  defaultSellerId,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [clientRequestId, setClientRequestId] = useState<string>('');

  const { data: salePoints, isLoading: loadingSalePoints } = useSalePoints();
  const { data: sellersData, isLoading: loadingSellers } = useUsers({
    role: UserRole.SELLER,
    limit: 200,
    offset: 0,
  });
  const { mutateAsync, isPending, error, reset } = useCreateMovement();

  useEffect(() => {
    if (open) {
      const mode: TargetMode = defaultSellerId ? 'seller' : 'sucursal';
      setForm({
        ...EMPTY,
        targetMode: mode,
        salePointId: defaultSalePointId ?? '',
        sellerId: defaultSellerId ?? '',
        type: defaultType ?? (mode === 'seller' ? MovementType.DEPOSIT : MovementType.EXPENSE),
      });
      reset();
    }
  }, [open, defaultSalePointId, defaultType, defaultSellerId, reset]);

  useEffect(() => {
    if (open) setClientRequestId(crypto.randomUUID());
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const switchMode = (mode: TargetMode) => {
    setForm((prev) => ({
      ...prev,
      targetMode: mode,
      type: mode === 'seller' ? MovementType.DEPOSIT : MovementType.EXPENSE,
      isPrizePayment: false,
    }));
  };

  const parsedAmount = parseInt(form.amount, 10);
  const amountValid =
    form.amount !== '' && Number.isInteger(parsedAmount) && parsedAmount >= 0;

  const isValid =
    amountValid &&
    (form.targetMode === 'sucursal'
      ? form.salePointId.length > 0
      : form.sellerId.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;
    await mutateAsync({
      salePointId: form.targetMode === 'sucursal' ? form.salePointId : undefined,
      sellerId: form.targetMode === 'seller' ? form.sellerId : undefined,
      isPrizePayment: form.isPrizePayment,
      type: form.type,
      amount: parsedAmount,
      description: form.description.trim() || undefined,
      occurredAt: `${form.occurredDate}T00:00:00-06:00`,
      clientRequestId,
    });
    onClose();
  };

  const typeOptions =
    form.targetMode === 'seller' ? SELLER_TYPE_OPTIONS : SUCURSAL_TYPE_OPTIONS;

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
        {/* Target mode toggle */}
        <div className="flex rounded-lg border border-border bg-secondary/40 p-1 gap-1">
          <ModeTab
            label="Sucursal"
            icon={<MapPin className="size-3.5" />}
            active={form.targetMode === 'sucursal'}
            onClick={() => switchMode('sucursal')}
          />
          <ModeTab
            label="Vendedor"
            icon={<User className="size-3.5" />}
            active={form.targetMode === 'seller'}
            onClick={() => switchMode('seller')}
          />
        </div>

        {form.targetMode === 'sucursal' ? (
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
                salePoints?.map((sp) => ({ value: sp.id, label: sp.name })) ??
                []
              }
            />
          </Field>
        ) : (
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
        )}

        <Field label="Tipo" required>
          <div className={cn('grid gap-2', form.targetMode === 'seller' ? 'grid-cols-3' : 'grid-cols-3')}>
            {typeOptions.map((opt) => (
              <TypeOption
                key={opt.value}
                active={form.type === opt.value}
                onClick={() => set('type', opt.value)}
                icon={opt.icon}
                label={opt.label}
                hint={'hint' in opt ? (opt as { hint?: string }).hint : undefined}
              />
            ))}
          </div>
        </Field>

        {/* Prize payment checkbox — seller mode only */}
        {form.targetMode === 'seller' && (
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
        )}

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
            placeholder={
              form.targetMode === 'seller'
                ? 'ej. Cobro semana 23, ajuste por diferencia en caja'
                : 'ej. Pago de luz, remesa desde bodega, ajuste caja'
            }
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

function ModeTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
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
