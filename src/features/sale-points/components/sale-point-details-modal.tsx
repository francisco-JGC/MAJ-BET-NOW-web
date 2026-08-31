import { useEffect, useMemo, useState } from 'react';
import {
  Handshake,
  Loader2,
  MapPin,
  Pencil,
  Percent,
  Save,
  Settings,
  Trash2,
  UserPlus,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import {
  useSetAssignedPartners,
  useUpdateSalePoint,
} from '@/features/sale-points/hooks/use-sale-points';
import { useUpdateUser, useUsers } from '@/features/users/hooks/use-users';
import { sucursalConfigPath } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import { UserRole } from '@/features/users/types';

import type { SalePoint } from '@/features/sale-points/types';

interface Props {
  open: boolean;
  onClose: () => void;
  salePoint: SalePoint | null;
}

interface FormState {
  name: string;
  code: string;
  ownerPartnerId: string;
  /** String para permitir vacío; se convierte a number|null al guardar. */
  partnerPaymentPercentage: string;
}

function stateFromSalePoint(sp: SalePoint): FormState {
  return {
    name: sp.name,
    code: sp.code,
    ownerPartnerId: sp.ownerPartnerId ?? '',
    partnerPaymentPercentage:
      sp.partnerPaymentPercentage === null
        ? ''
        : String(sp.partnerPaymentPercentage),
  };
}

export function SalePointDetailsModal({ open, onClose, salePoint }: Props) {
  const session = useSession();
  const isAdmin = session?.user.role === UserRole.ADMIN;
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [pickerValue, setPickerValue] = useState('');
  const [partnerPickerValue, setPartnerPickerValue] = useState('');

  const { mutateAsync: mutateSalePoint, isPending: savingInfo, error: infoError, reset: resetInfo } =
    useUpdateSalePoint();
  const { mutateAsync: mutateUser, isPending: mutatingUser } = useUpdateUser();
  const { mutateAsync: mutateAssignedPartners, isPending: mutatingAssigned } =
    useSetAssignedPartners();

  const { data: sellersPage, isLoading: loadingSellers } = useUsers({
    role: UserRole.SELLER,
    limit: 100,
    offset: 0,
  });
  const { data: partnersPage } = useUsers({
    role: UserRole.PARTNER,
    limit: 100,
    offset: 0,
  });

  useEffect(() => {
    if (open && salePoint) {
      setForm(stateFromSalePoint(salePoint));
      setEditing(false);
      setPickerValue('');
      setPartnerPickerValue('');
      resetInfo();
    }
  }, [open, salePoint, resetInfo]);

  const sellers = sellersPage?.items ?? [];
  const assigned = useMemo(
    () => sellers.filter((s) => s.salePointId === salePoint?.id),
    [sellers, salePoint?.id],
  );
  const available = useMemo(
    () => sellers.filter((s) => s.salePointId === null),
    [sellers],
  );

  const partnersAll = partnersPage?.items ?? [];
  const assignedPartnerIds = salePoint?.assignedPartnerIds ?? [];
  const assignedPartners = useMemo(() => {
    const idSet = new Set(assignedPartnerIds);
    return partnersAll.filter((p) => idSet.has(p.id));
  }, [partnersAll, assignedPartnerIds]);
  // Available = partners that are neither already assigned nor the current
  // encargado (the encargado already has full visibility, so exposing them in
  // the picker would only invite redundant assignments).
  const availablePartners = useMemo(() => {
    const excluded = new Set<string>(assignedPartnerIds);
    if (salePoint?.ownerPartnerId) excluded.add(salePoint.ownerPartnerId);
    return partnersAll.filter((p) => !excluded.has(p.id));
  }, [partnersAll, assignedPartnerIds, salePoint?.ownerPartnerId]);

  if (!salePoint || !form) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const trimmed = {
    name: form.name.trim(),
    code: form.code.trim(),
  };
  const pctRaw = form.partnerPaymentPercentage.trim();
  const pctValid =
    pctRaw === '' ||
    (/^\d+$/.test(pctRaw) &&
      Number(pctRaw) >= 0 &&
      Number(pctRaw) <= 100);
  const isValid =
    trimmed.name.length > 0 &&
    trimmed.code.length >= 2 &&
    /^[A-Za-z0-9-]+$/.test(trimmed.code) &&
    pctValid;

  const partners = partnersPage?.items ?? [];
  const partnerName = salePoint.ownerPartnerId
    ? partners.find((p) => p.id === salePoint.ownerPartnerId)?.name ?? null
    : null;

  const handleSaveInfo = async () => {
    if (!isValid || savingInfo) return;
    const nextPct = pctRaw === '' ? null : Number(pctRaw);
    await mutateSalePoint({
      id: salePoint.id,
      payload: {
        name: trimmed.name !== salePoint.name ? trimmed.name : undefined,
        code: trimmed.code !== salePoint.code ? trimmed.code : undefined,
        ownerPartnerId: diffPartner(form.ownerPartnerId, salePoint.ownerPartnerId),
        partnerPaymentPercentage:
          nextPct === salePoint.partnerPaymentPercentage
            ? undefined
            : nextPct,
      },
    });
    setEditing(false);
  };

  const handleAdd = async () => {
    if (!pickerValue || mutatingUser) return;
    const user = sellers.find((s) => s.id === pickerValue);
    if (!user) return;
    await mutateUser({
      id: pickerValue,
      payload: { salePointId: salePoint.id },
      successMessage: `${user.name} asignado a ${salePoint.name}`,
    });
    setPickerValue('');
  };

  const handleRemove = async (userId: string, name: string) => {
    if (mutatingUser) return;
    await mutateUser({
      id: userId,
      payload: { salePointId: null },
      successMessage: `${name} desasignado`,
    });
  };

  const handleAddPartner = async () => {
    if (!partnerPickerValue || mutatingAssigned) return;
    const nextIds = [...assignedPartnerIds, partnerPickerValue];
    await mutateAssignedPartners({
      id: salePoint.id,
      payload: { partnerIds: nextIds },
    });
    setPartnerPickerValue('');
  };

  const handleRemovePartner = async (partnerId: string) => {
    if (mutatingAssigned) return;
    const nextIds = assignedPartnerIds.filter((id) => id !== partnerId);
    await mutateAssignedPartners({
      id: salePoint.id,
      payload: { partnerIds: nextIds },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar sucursal' : 'Detalles de la sucursal'}
      size="max-w-3xl"
      footer={
        editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setForm(stateFromSalePoint(salePoint));
                resetInfo();
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveInfo}
              disabled={!isValid || savingInfo}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition',
                !isValid || savingInfo
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-primary/90',
              )}
            >
              {savingInfo ? (
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
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cerrar
            </button>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(sucursalConfigPath(salePoint.id));
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
                >
                  <Settings className="size-4" strokeWidth={2.4} />
                  Configuración
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
            )}
          </>
        )
      }
    >
      <SalePointHeader salePoint={salePoint} partnerName={partnerName} />

      {infoError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {infoError.message}
        </div>
      )}

      {editing ? (
        <InfoEditForm
          form={form}
          onChange={set}
          partners={partners}
        />
      ) : (
        <InfoGrid salePoint={salePoint} partnerName={partnerName} />
      )}


      <div className="mt-6 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              Vendedores asignados
            </h3>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {assigned.length}
            </span>
          </div>
        </div>

        {loadingSellers ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto size-4 animate-spin" />
          </div>
        ) : assigned.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-slate-50/50 px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay vendedores en esta sucursal.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card">
            {assigned.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-black text-white">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{user.username}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemove(user.id, user.name)}
                    disabled={mutatingUser}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/10',
                      mutatingUser && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2.4} />
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isAdmin && (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Añadir vendedor sin sucursal
              </label>
              <Select
                value={pickerValue}
                onChange={setPickerValue}
                leadingIcon={<UserPlus className="size-4" />}
                placeholder={
                  available.length === 0
                    ? 'No hay vendedores libres'
                    : 'Selecciona un vendedor'
                }
                disabled={available.length === 0 || mutatingUser}
                options={available.map((u) => ({
                  value: u.id,
                  label: u.name,
                }))}
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!pickerValue || mutatingUser}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground',
                !pickerValue || mutatingUser
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-primary/90',
              )}
            >
              {mutatingUser ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" strokeWidth={2.4} />
              )}
              Añadir
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              Socios asignados
            </h3>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {assignedPartners.length}
            </span>
          </div>
        </div>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Otros socios que verán la información de esta sucursal (dashboards
          y reportes). No la administran.
        </p>

        {assignedPartners.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-slate-50/50 px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no hay socios asignados a esta sucursal.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card">
            {assignedPartners.map((partner) => (
              <li
                key={partner.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-black text-white">
                    {partner.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {partner.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @{partner.username}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRemovePartner(partner.id)}
                    disabled={mutatingAssigned}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-500/10',
                      mutatingAssigned && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2.4} />
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isAdmin && (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Añadir socio
              </label>
              <Select
                value={partnerPickerValue}
                onChange={setPartnerPickerValue}
                leadingIcon={<Handshake className="size-4" />}
                placeholder={
                  availablePartners.length === 0
                    ? 'No hay socios disponibles'
                    : 'Selecciona un socio'
                }
                disabled={
                  availablePartners.length === 0 || mutatingAssigned
                }
                options={availablePartners.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
              />
            </div>
            <button
              type="button"
              onClick={handleAddPartner}
              disabled={!partnerPickerValue || mutatingAssigned}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground',
                !partnerPickerValue || mutatingAssigned
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-primary/90',
              )}
            >
              {mutatingAssigned ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" strokeWidth={2.4} />
              )}
              Añadir
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function diffPartner(
  next: string,
  current: string | null,
): string | null | undefined {
  const normalized = next.length === 0 ? null : next;
  if (normalized === current) return undefined;
  return normalized;
}

function SalePointHeader({
  salePoint,
  partnerName,
}: {
  salePoint: SalePoint;
  partnerName: string | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50/60 p-4 ring-1 ring-inset ring-border/60">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-base font-black text-white">
          {salePoint.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-tight">
            {salePoint.name}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">
              {salePoint.code}
            </span>
            {partnerName && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Handshake className="size-3 text-indigo-600" />
                  {partnerName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <StatusBadge active={salePoint.isActive} />
    </div>
  );
}

function InfoGrid({
  salePoint,
  partnerName,
}: {
  salePoint: SalePoint;
  partnerName: string | null;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <ReadRow label="Nombre">{salePoint.name}</ReadRow>
      <ReadRow label="Código">
        <span className="font-mono">{salePoint.code}</span>
      </ReadRow>
      <ReadRow label="Encargado">
        {partnerName ? (
          <span className="inline-flex items-center gap-1">
            <Handshake className="size-3.5 text-indigo-600" />
            {partnerName}
          </span>
        ) : (
          <span className="text-muted-foreground/60">Sin encargado</span>
        )}
      </ReadRow>
      <ReadRow label="% de pago al encargado">
        {salePoint.partnerPaymentPercentage === null ? (
          <span className="text-muted-foreground/60">Sin configurar</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Percent className="size-3.5 text-indigo-600" />
            {salePoint.partnerPaymentPercentage}%
          </span>
        )}
      </ReadRow>
      <ReadRow label="Creada">
        {new Intl.DateTimeFormat('es', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }).format(new Date(salePoint.createdAt))}
      </ReadRow>
    </dl>
  );
}

function ReadRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function InfoEditForm({
  form,
  onChange,
  partners,
}: {
  form: FormState;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  partners: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre" required>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            maxLength={120}
            className={cn(inputClass, 'pl-9')}
          />
        </div>
      </Field>

      <Field
        label="Código"
        required
        hint="Solo letras, números y guiones. Mínimo 2."
      >
        <input
          type="text"
          value={form.code}
          onChange={(e) => onChange('code', e.target.value.toUpperCase())}
          maxLength={30}
          className={cn(inputClass, 'font-mono uppercase')}
        />
      </Field>

      <Field label="Encargado de sucursal" hint="Vacío = opera el owner">
        <Select
          value={form.ownerPartnerId}
          onChange={(v) => onChange('ownerPartnerId', v)}
          leadingIcon={<Handshake className="size-4" />}
          placeholder="Sin encargado (opera el owner)"
          options={[
            { value: '', label: 'Sin encargado (opera el owner)' },
            ...partners.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </Field>

      <Field
        label="% de pago al encargado"
        hint="Entero 0–100. Aplica aunque no haya un socio asignado. Vacío = sin comisión."
      >
        <div className="relative">
          <Percent className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={form.partnerPaymentPercentage}
            onChange={(e) =>
              onChange('partnerPaymentPercentage', e.target.value)
            }
            placeholder="ej. 10"
            className={cn(inputClass, 'pl-9')}
          />
        </div>
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

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20">
      <X className="size-3" strokeWidth={2.6} />
      Inactiva
    </span>
  );
}


