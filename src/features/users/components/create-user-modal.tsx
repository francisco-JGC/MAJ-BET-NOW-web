import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, MapPin, Save, Sparkles } from 'lucide-react';

import { useSession } from '@/features/auth/hooks/use-session';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useCreateUser } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { generatePassword } from '@/shared/lib/password';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import { UserRole } from '@/features/users/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  username: string;
  password: string;
  role: UserRole;
  paymentPercentage: string; // held as string to allow empty input
  salePointId: string;
  phone: string;
  address: string;
  nationalId: string;
}

const EMPTY: FormState = {
  name: '',
  username: '',
  password: '',
  role: UserRole.SELLER,
  paymentPercentage: '',
  salePointId: '',
  phone: '',
  address: '',
  nationalId: '',
};

export function CreateUserModal({ open, onClose }: Props) {
  const session = useSession();
  const isPartner = session?.user.role === UserRole.PARTNER;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [showPassword, setShowPassword] = useState(false);
  const { data: salePoints, isLoading: loadingSalePoints } = useSalePoints();
  const { mutateAsync, isPending, error, reset } = useCreateUser();

  useEffect(() => {
    if (open) {
      // Partners can only create sellers — force the role so they can't
      // even see the other options.
      setForm({ ...EMPTY, role: isPartner ? UserRole.SELLER : EMPTY.role });
      setShowPassword(false);
      reset();
    }
  }, [open, reset, isPartner]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const trimmed = useMemo(
    () => ({
      name: form.name.trim(),
      username: form.username.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      nationalId: form.nationalId.trim(),
    }),
    [form.name, form.username, form.phone, form.address, form.nationalId],
  );

  const paymentPercentage = parseInt(form.paymentPercentage, 10);
  const paymentValid =
    form.paymentPercentage === '' ||
    (Number.isInteger(paymentPercentage) &&
      paymentPercentage >= 0 &&
      paymentPercentage <= 100);

  // Partners MUST assign the new seller to one of their sucursales
  // (the backend rejects otherwise). Admins can leave it blank.
  const salePointValid = !isPartner || form.salePointId.length > 0;

  const isValid =
    trimmed.name.length > 0 &&
    trimmed.username.length >= 3 &&
    form.password.length >= 6 &&
    paymentValid &&
    salePointValid;

  const handleGenerate = () => {
    set('password', generatePassword());
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;
    // `paymentPercentage` es la comisión del vendedor sobre sus propias
    // ventas. El socio-encargado NO lleva % acá — el % de las ventas de
    // la sucursal se configura en el modal de la sucursal (aplica
    // aunque no haya socio asignado).
    const isSeller = form.role === UserRole.SELLER;
    await mutateAsync({
      name: trimmed.name,
      username: trimmed.username,
      password: form.password,
      role: form.role,
      phone: trimmed.phone || undefined,
      address: trimmed.address || undefined,
      nationalId: trimmed.nationalId || undefined,
      paymentPercentage:
        isSeller && form.paymentPercentage ? paymentPercentage : undefined,
      salePointId: isSeller ? form.salePointId || undefined : undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo usuario"
      description="Los usuarios con rol vendedor podrán iniciar sesión en la app móvil."
      size="max-w-3xl"
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
            form="create-user-form"
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
        id="create-user-form"
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Nombre completo" required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Escriba el nombre completo"
            maxLength={120}
            autoFocus
            className={inputClass}
          />
        </Field>

        <Field
          label="Nombre de usuario"
          hint="Sin espacios, mínimo 3 caracteres"
          required
        >
          <input
            type="text"
            value={form.username}
            onChange={(e) =>
              set('username', e.target.value.replace(/\s+/g, ''))
            }
            placeholder="ej. juanperez"
            maxLength={60}
            className={inputClass}
          />
        </Field>

        <Field
          label="Contraseña"
          hint="Mínimo 6 caracteres · usa el ícono para generar una"
          required
        >
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              maxLength={72}
              className={cn(inputClass, 'pr-20 font-mono')}
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                aria-label="Generar contraseña"
                title="Generar contraseña automática"
                className="flex size-7 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
              >
                <Sparkles className="size-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </Field>

        {!isPartner && (
          <Field label="Rol" required>
            <div className="grid grid-cols-3 gap-2">
              <RoleOption
                active={form.role === UserRole.SELLER}
                onClick={() => set('role', UserRole.SELLER)}
                title="Vendedor"
                subtitle="App móvil"
              />
              <RoleOption
                active={form.role === UserRole.PARTNER}
                onClick={() => set('role', UserRole.PARTNER)}
                title="Socio"
                subtitle="Sus sucursales"
              />
              <RoleOption
                active={form.role === UserRole.ADMIN}
                onClick={() => set('role', UserRole.ADMIN)}
                title="Administrador"
                subtitle="Todo el sistema"
              />
            </div>
          </Field>
        )}

        {form.role === UserRole.SELLER && (
          <Field
            label="Porcentaje de pago"
            hint="Comisión semanal sobre el total de ventas del vendedor"
          >
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={form.paymentPercentage}
                onChange={(e) => set('paymentPercentage', e.target.value)}
                placeholder="ej. 13"
                className={cn(inputClass, 'pr-8')}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>
        )}

        {form.role === UserRole.SELLER && (
          <Field label="Sucursal" required={isPartner}>
            <Select
              value={form.salePointId}
              onChange={(v) => set('salePointId', v)}
              leadingIcon={<MapPin className="size-4" />}
              placeholder={
                loadingSalePoints ? 'Cargando…' : 'Seleccione una sucursal'
              }
              disabled={loadingSalePoints}
              options={[
                ...(isPartner
                  ? []
                  : [{ value: '', label: 'Sin sucursal' }]),
                ...(salePoints?.map((sp) => ({
                  value: sp.id,
                  label: sp.name,
                })) ?? []),
              ]}
            />
          </Field>
        )}

        <Field label="Teléfono" hint="ej. 8888-9999">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="0000-0000"
            maxLength={20}
            className={inputClass}
          />
        </Field>

        <Field label="Cédula" hint="ej. 281-030590-0002P">
          <input
            type="text"
            value={form.nationalId}
            onChange={(e) => set('nationalId', e.target.value)}
            placeholder="000-000000-0000X"
            maxLength={20}
            className={cn(inputClass, 'font-mono uppercase')}
          />
        </Field>

        <Field label="Dirección">
          <input
            type="text"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="Escriba la dirección del usuario"
            maxLength={255}
            className={inputClass}
          />
        </Field>

        {error && (
          <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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
    <label className="space-y-1.5">
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

function RoleOption({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition',
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-secondary/60',
      )}
    >
      <span className="text-sm font-bold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </button>
  );
}
