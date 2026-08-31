import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';

import { useSession } from '@/features/auth/hooks/use-session';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useUpdateUser } from '@/features/users/hooks/use-users';
import { cn } from '@/shared/lib/cn';
import { generatePassword } from '@/shared/lib/password';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import { UserRole } from '@/features/users/types';
import type { User } from '@/features/users/types';

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null;
}

interface FormState {
  name: string;
  password: string;
  role: UserRole;
  paymentPercentage: string;
  salePointId: string;
  phone: string;
  address: string;
  nationalId: string;
}

function stateFromUser(user: User): FormState {
  return {
    name: user.name,
    password: '',
    role: user.role,
    paymentPercentage:
      user.paymentPercentage !== null ? String(user.paymentPercentage) : '',
    salePointId: user.salePointId ?? '',
    phone: user.phone ?? '',
    address: user.address ?? '',
    nationalId: user.nationalId ?? '',
  };
}

export function UserDetailsModal({ open, onClose, user }: Props) {
  const session = useSession();
  const canEditRole = session?.user.role === UserRole.ADMIN;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: salePoints } = useSalePoints();
  const { mutateAsync, isPending, error, reset } = useUpdateUser();

  // Reset every time we open or the user changes.
  useEffect(() => {
    if (open && user) {
      setForm(stateFromUser(user));
      setEditing(false);
      setShowPassword(false);
      reset();
    }
  }, [open, user, reset]);

  const salePointName = useMemo(() => {
    if (!user?.salePointId || !salePoints) return null;
    return salePoints.find((sp) => sp.id === user.salePointId)?.name ?? null;
  }, [user?.salePointId, salePoints]);

  if (!user || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const trimmed = {
    name: form.name.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    nationalId: form.nationalId.trim(),
  };
  const parsedPct = parseInt(form.paymentPercentage, 10);
  const pctValid =
    form.paymentPercentage === '' ||
    (Number.isInteger(parsedPct) && parsedPct >= 0 && parsedPct <= 100);
  const pwdValid = form.password === '' || form.password.length >= 6;
  const isValid = trimmed.name.length > 0 && pctValid && pwdValid;

  const handleGenerate = () => {
    set('password', generatePassword());
    setShowPassword(true);
  };

  const handleSave = async () => {
    if (!isValid || isPending) return;
    // `paymentPercentage` es solo para vendedores (comisión sobre sus
    // propias ventas). El % del encargado se configura a nivel sucursal.
    // Al cambiar de vendedor a otro rol, se nullea para no dejar valores
    // "colgados" sin significado.
    const isSeller = form.role === UserRole.SELLER;
    await mutateAsync({
      id: user.id,
      payload: {
        name: trimmed.name !== user.name ? trimmed.name : undefined,
        role: form.role !== user.role ? form.role : undefined,
        password: form.password ? form.password : undefined,
        phone: diffNullable(trimmed.phone, user.phone),
        address: diffNullable(trimmed.address, user.address),
        nationalId: diffNullable(trimmed.nationalId, user.nationalId),
        paymentPercentage: isSeller
          ? diffNullableNumber(form.paymentPercentage, user.paymentPercentage)
          : user.paymentPercentage !== null
            ? null
            : undefined,
        salePointId: isSeller
          ? diffNullable(form.salePointId, user.salePointId)
          : user.salePointId !== null
            ? null
            : undefined,
      },
      successMessage: 'Usuario actualizado',
    });
    setEditing(false);
    setForm((prev) => (prev ? { ...prev, password: '' } : prev));
    setShowPassword(false);
  };

  const handleToggleAccess = async () => {
    if (isPending) return;
    const next = !user.isActive;
    await mutateAsync({
      id: user.id,
      payload: { isActive: next },
      successMessage: next
        ? `Acceso reactivado para ${user.name}`
        : `Acceso bloqueado para ${user.name}`,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar usuario' : 'Detalles del usuario'}
      description={
        editing
          ? 'Los campos vacíos no modifican el valor actual.'
          : undefined
      }
      size="max-w-3xl"
      footer={
        editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(stateFromUser(user));
                setShowPassword(false);
                reset();
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
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
              Guardar cambios
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleToggleAccess}
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition',
                user.isActive
                  ? 'text-rose-700 hover:bg-rose-500/10'
                  : 'text-emerald-700 hover:bg-emerald-500/10',
                isPending && 'cursor-not-allowed opacity-60',
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : user.isActive ? (
                <Lock className="size-4" strokeWidth={2.4} />
              ) : (
                <Unlock className="size-4" strokeWidth={2.4} />
              )}
              {user.isActive ? 'Bloquear acceso' : 'Reactivar acceso'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="size-4" strokeWidth={2.4} />
              Editar
            </button>
          </>
        )
      }
    >
      <UserHeader user={user} salePointName={salePointName} />

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {editing ? (
        <EditForm
          form={form}
          onChange={set}
          salePoints={salePoints ?? []}
          showPassword={showPassword}
          canEditRole={canEditRole}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onGenerate={handleGenerate}
        />
      ) : (
        <DetailsGrid user={user} salePointName={salePointName} />
      )}
    </Modal>
  );
}

function diffNullable(
  next: string,
  current: string | null,
): string | null | undefined {
  const normalized = next.length === 0 ? null : next;
  if (normalized === current) return undefined;
  return normalized;
}

function diffNullableNumber(
  raw: string,
  current: number | null,
): number | null | undefined {
  const normalized = raw === '' ? null : parseInt(raw, 10);
  if (normalized === current) return undefined;
  return normalized;
}

function UserHeader({
  user,
  salePointName,
}: {
  user: User;
  salePointName: string | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50/60 p-4 ring-1 ring-inset ring-border/60">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-base font-black text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-tight">
            {user.name}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              @{user.username}
            </span>
            {salePointName && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground">
                  {salePointName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <RoleBadge role={user.role} />
        <AccessBadge active={user.isActive} />
      </div>
    </div>
  );
}

function DetailsGrid({
  user,
  salePointName,
}: {
  user: User;
  salePointName: string | null;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <ReadRow label="Sucursal">
        {salePointName ?? <span className="text-muted-foreground/60">—</span>}
      </ReadRow>
      <ReadRow label="Cédula">
        {user.nationalId ? (
          <span className="font-mono">{user.nationalId}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </ReadRow>
      <ReadRow label="Teléfono">
        {user.phone ? (
          <span className="font-mono">{user.phone}</span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </ReadRow>
      <ReadRow label="Porcentaje de pago" hint="Comisión semanal">
        {user.paymentPercentage !== null ? (
          <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            {user.paymentPercentage}%
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </ReadRow>
      <ReadRow label="Creado">
        {new Intl.DateTimeFormat('es', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(user.createdAt))}
      </ReadRow>
      <ReadRow label="Dirección" wide>
        {user.address ?? <span className="text-muted-foreground/60">—</span>}
      </ReadRow>
    </dl>
  );
}

function ReadRow({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
        {hint && (
          <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/70">
            · {hint}
          </span>
        )}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function EditForm({
  form,
  onChange,
  salePoints,
  showPassword,
  canEditRole,
  onTogglePassword,
  onGenerate,
}: {
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  salePoints: { id: string; name: string }[];
  showPassword: boolean;
  canEditRole: boolean;
  onTogglePassword: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre completo" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
          maxLength={120}
          className={inputClass}
        />
      </Field>

      {canEditRole && (
        <Field label="Rol">
          <div className="grid grid-cols-3 gap-2">
            <RoleOption
              active={form.role === UserRole.SELLER}
              onClick={() => onChange('role', UserRole.SELLER)}
              title="Vendedor"
              subtitle="App móvil"
            />
            <RoleOption
              active={form.role === UserRole.PARTNER}
              onClick={() => onChange('role', UserRole.PARTNER)}
              title="Socio"
              subtitle="Sus sucursales"
            />
            <RoleOption
              active={form.role === UserRole.ADMIN}
              onClick={() => onChange('role', UserRole.ADMIN)}
              title="Administrador"
              subtitle="Todo el sistema"
            />
          </div>
        </Field>
      )}

      <Field
        label="Nueva contraseña"
        hint="Déjala vacía para conservar la actual"
      >
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder="••••••••"
            maxLength={72}
            className={cn(inputClass, 'pr-20 font-mono')}
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
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
              onClick={onGenerate}
              aria-label="Generar contraseña"
              title="Generar contraseña automática"
              className="flex size-7 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-500/10"
            >
              <Sparkles className="size-4" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </Field>

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
              onChange={(e) => onChange('paymentPercentage', e.target.value)}
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
        <Field label="Sucursal">
          <Select
            value={form.salePointId}
            onChange={(v) => onChange('salePointId', v)}
            leadingIcon={<MapPin className="size-4" />}
            placeholder="Sin sucursal"
            options={[
              { value: '', label: 'Sin sucursal' },
              ...salePoints.map((sp) => ({
                value: sp.id,
                label: sp.name,
              })),
            ]}
          />
        </Field>
      )}

      <Field label="Cédula">
        <input
          type="text"
          value={form.nationalId}
          onChange={(e) => onChange('nationalId', e.target.value)}
          placeholder="000-000000-0000X"
          maxLength={20}
          className={cn(inputClass, 'font-mono uppercase')}
        />
      </Field>

      <Field label="Teléfono">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="0000-0000"
          maxLength={20}
          className={inputClass}
        />
      </Field>

      <Field label="Dirección">
        <input
          type="text"
          value={form.address}
          onChange={(e) => onChange('address', e.target.value)}
          maxLength={255}
          className={inputClass}
        />
      </Field>
    </div>
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

const ROLE_STYLE: Record<UserRole, { classes: string; label: string }> = {
  admin: {
    classes: 'bg-amber-500/10 text-amber-700 ring-amber-500/20',
    label: 'Administrador',
  },
  partner: {
    classes: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20',
    label: 'Socio',
  },
  seller: {
    classes: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
    label: 'Vendedor',
  },
};

function RoleBadge({ role }: { role: UserRole }) {
  const style = ROLE_STYLE[role];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        style.classes,
      )}
    >
      {style.label}
    </span>
  );
}

function AccessBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
      <ShieldCheck className="size-3" strokeWidth={2.6} />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20">
      <X className="size-3" strokeWidth={2.6} />
      Bloqueado
    </span>
  );
}
