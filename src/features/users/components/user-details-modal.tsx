import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';

import { useSession } from '@/features/auth/hooks/use-session';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import {
  useSyncPreview,
  useSyncSellerBranch,
  useTransferPreview,
  useTransferSellerBranch,
  useUpdateUser,
} from '@/features/users/hooks/use-users';
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
  /** When true the modal opens directly in edit mode. */
  startEditing?: boolean;
}

interface FormState {
  username: string;
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
    username: user.username,
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

export function UserDetailsModal({ open, onClose, user, startEditing }: Props) {
  const session = useSession();
  const isAdmin = session?.user.role === UserRole.ADMIN;
  const canEditRole = isAdmin;

  const [editing, setEditing] = useState(false);
  const [transferMode, setTransferMode] = useState<'idle' | 'select' | 'executing' | 'sync-confirm' | 'sync-executing'>('idle');
  const [newSalePointId, setNewSalePointId] = useState('');
  const [txProgress, setTxProgress] = useState(0);
  const [txPhase, setTxPhase] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: salePoints } = useSalePoints();
  const { mutateAsync, isPending, error, reset } = useUpdateUser();
  const transferMutation = useTransferSellerBranch();
  const syncMutation = useSyncSellerBranch();
  const { data: preview, isFetching: previewFetching } = useTransferPreview(
    user?.id ?? '',
    newSalePointId,
    !!(user && newSalePointId && transferMode === 'select'),
  );
  const { data: syncPreview, isFetching: syncPreviewFetching } = useSyncPreview(
    user?.id ?? '',
    !!(user && transferMode === 'sync-confirm'),
  );

  // Reset every time we open or the user changes.
  useEffect(() => {
    if (open && user) {
      setForm(stateFromUser(user));
      setEditing(!!startEditing);
      setTransferMode('idle');
      setNewSalePointId('');
      setTxProgress(0);
      setTxPhase('');
      setShowPassword(false);
      reset();
    }
  }, [open, user, reset, startEditing]);

  // Animate progress bar while executing a transfer or sync.
  useEffect(() => {
    const isRunning = transferMode === 'executing' || transferMode === 'sync-executing';
    if (!isRunning) return;

    const activePreview = transferMode === 'sync-executing' ? syncPreview : preview;
    const ticketCount = activePreview?.ticketCount ?? 0;
    const movementCount = activePreview?.movementCount ?? 0;
    const ticketMs = Math.min(Math.max(ticketCount * 4, 800), 10_000);
    const movementMs = Math.min(Math.max(movementCount * 8, 400), 4_000);
    const verb = transferMode === 'sync-executing' ? 'Sincronizando' : 'Transfiriendo';

    setTxProgress(0);
    setTxPhase('Iniciando...');

    const t1 = setTimeout(() => { setTxProgress(8); setTxPhase('Actualizando datos del vendedor...'); }, 200);
    const t2 = setTimeout(() => { setTxProgress(15); setTxPhase(`${verb} tickets (${ticketCount.toLocaleString()} registros)...`); }, 500);
    const t3 = setTimeout(() => { setTxProgress(72); setTxPhase(`${verb} movimientos (${movementCount.toLocaleString()} registros)...`); }, 500 + ticketMs);
    const t4 = setTimeout(() => { setTxProgress(88); setTxPhase('Finalizando...'); }, 500 + ticketMs + movementMs);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [transferMode, preview?.ticketCount, preview?.movementCount, syncPreview?.ticketCount, syncPreview?.movementCount]);

  // When transfer mutation completes, finish animation then close.
  useEffect(() => {
    if (!transferMutation.isSuccess || transferMode !== 'executing') return;
    setTxProgress(100);
    setTxPhase('¡Transferencia completada!');
    const t = setTimeout(() => {
      setTransferMode('idle');
      setNewSalePointId('');
      onClose();
    }, 1500);
    return () => clearTimeout(t);
  }, [transferMutation.isSuccess, transferMode, onClose]);

  // When sync mutation completes, finish animation then close.
  useEffect(() => {
    if (!syncMutation.isSuccess || transferMode !== 'sync-executing') return;
    setTxProgress(100);
    setTxPhase('¡Sincronización completada!');
    const t = setTimeout(() => {
      setTransferMode('idle');
      onClose();
    }, 1500);
    return () => clearTimeout(t);
  }, [syncMutation.isSuccess, transferMode, onClose]);

  const salePointName = useMemo(() => {
    if (!user?.salePointId || !salePoints) return null;
    return salePoints.find((sp) => sp.id === user.salePointId)?.name ?? null;
  }, [user?.salePointId, salePoints]);

  const availableTargetBranches = useMemo(
    () => (salePoints ?? []).filter((sp) => sp.id !== user?.salePointId),
    [salePoints, user?.salePointId],
  );

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
  const usernameValid = form.username.trim().length >= 3;
  const isValid = trimmed.name.length > 0 && pctValid && pwdValid && usernameValid;

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
    const trimmedUsername = form.username.trim();
    await mutateAsync({
      id: user.id,
      payload: {
        username: trimmedUsername !== user.username ? trimmedUsername : undefined,
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

  const handleConfirmTransfer = () => {
    if (!newSalePointId || transferMutation.isPending) return;
    const branchName =
      salePoints?.find((sp) => sp.id === newSalePointId)?.name ?? newSalePointId;
    setTransferMode('executing');
    transferMutation.mutate({
      userId: user.id,
      newSalePointId,
      sellerName: user.name,
      branchName,
    });
  };

  const handleConfirmSync = () => {
    if (syncMutation.isPending) return;
    const branchName = salePointName ?? user.salePointId ?? '';
    setTransferMode('sync-executing');
    syncMutation.mutate({ userId: user.id, sellerName: user.name, branchName });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        transferMode === 'select' || transferMode === 'executing'
          ? 'Transferir a otra sucursal'
          : transferMode === 'sync-confirm' || transferMode === 'sync-executing'
            ? 'Sincronizar datos'
            : editing
              ? 'Editar usuario'
              : 'Detalles del usuario'
      }
      description={
        transferMode === 'select'
          ? `Selecciona la nueva sucursal para ${user.name}. Se moverán todos sus tickets y movimientos.`
          : transferMode === 'sync-confirm'
            ? `Sincroniza los tickets y movimientos de ${user.name} a su sucursal actual.`
            : transferMode === 'executing' || transferMode === 'sync-executing'
              ? undefined
              : editing
                ? 'Los campos vacíos no modifican el valor actual.'
                : undefined
      }
      size="max-w-3xl"
      footer={
        transferMode === 'executing' || transferMode === 'sync-executing' ? null
        : transferMode === 'select' ? (
          <>
            <button
              type="button"
              onClick={() => { setTransferMode('idle'); setNewSalePointId(''); }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmTransfer}
              disabled={!newSalePointId || previewFetching || !preview}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white transition',
                (!newSalePointId || previewFetching || !preview)
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-amber-700',
              )}
            >
              {previewFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRightLeft className="size-4" strokeWidth={2.4} />
              )}
              Confirmar transferencia
            </button>
          </>
        ) : transferMode === 'sync-confirm' ? (
          <>
            <button
              type="button"
              onClick={() => setTransferMode('idle')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSync}
              disabled={syncPreviewFetching || !syncPreview}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition',
                (syncPreviewFetching || !syncPreview)
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-indigo-700',
              )}
            >
              {syncPreviewFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" strokeWidth={2.4} />
              )}
              Confirmar sincronización
            </button>
          </>
        ) : editing ? (
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
            {isAdmin && user.role === UserRole.SELLER && user.salePointId && (
              <button
                type="button"
                onClick={() => setTransferMode('sync-confirm')}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <RefreshCw className="size-4" strokeWidth={2.4} />
                Sincronizar datos
              </button>
            )}
            {isAdmin && user.role === UserRole.SELLER && (
              <button
                type="button"
                onClick={() => setTransferMode('select')}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
              >
                <ArrowRightLeft className="size-4" strokeWidth={2.4} />
                Transferir sucursal
              </button>
            )}
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

      {transferMode === 'executing' || transferMode === 'sync-executing' ? (
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{txPhase}</span>
              <span className="tabular-nums text-muted-foreground">{txProgress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700 ease-out"
                style={{ width: `${txProgress}%` }}
              />
            </div>
          </div>
          {(transferMode === 'executing' ? preview : syncPreview) && (
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Tickets: <strong className="text-foreground">{(transferMode === 'executing' ? preview : syncPreview)!.ticketCount.toLocaleString()}</strong></span>
              <span>Movimientos: <strong className="text-foreground">{(transferMode === 'executing' ? preview : syncPreview)!.movementCount.toLocaleString()}</strong></span>
            </div>
          )}
          {(transferMode === 'executing' ? transferMutation : syncMutation).isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {(transferMode === 'executing' ? transferMutation : syncMutation).error?.message}
            </div>
          )}
        </div>
      ) : transferMode === 'sync-confirm' ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-indigo-600" strokeWidth={2.4} />
              <div className="text-sm text-indigo-900 dark:text-indigo-200">
                Se moverán todos los tickets y movimientos de <strong>{user.name}</strong> que
                no estén registrados bajo <strong>{salePointName ?? 'su sucursal actual'}</strong>.
              </div>
            </div>
          </div>
          {syncPreview && !syncPreviewFetching ? (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Registros fuera de sincronía
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-2xl font-black text-foreground">{syncPreview.ticketCount.toLocaleString()}</span>
                  <span className="ml-1.5 text-muted-foreground">tickets</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-foreground">{syncPreview.movementCount.toLocaleString()}</span>
                  <span className="ml-1.5 text-muted-foreground">movimientos</span>
                </div>
              </div>
              {syncPreview.ticketCount === 0 && syncPreview.movementCount === 0 && (
                <p className="mt-2 text-sm text-emerald-700">Todo está sincronizado. No hay registros que mover.</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Calculando registros fuera de sincronía...
            </div>
          )}
          {syncMutation.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {syncMutation.error.message}
            </div>
          )}
        </div>
      ) : transferMode === 'select' ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" strokeWidth={2.4} />
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <strong>Esta acción es permanente.</strong> Todos los tickets y movimientos de{' '}
                <strong>{user.name}</strong> quedarán registrados bajo la nueva sucursal. Solo un administrador puede revertirlo.
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">
              Sucursal de destino <span className="text-destructive">*</span>
            </label>
            <Select
              value={newSalePointId}
              onChange={setNewSalePointId}
              leadingIcon={<MapPin className="size-4" />}
              placeholder="Selecciona una sucursal"
              options={availableTargetBranches.map((sp) => ({
                value: sp.id,
                label: sp.name,
              }))}
            />
            {user.salePointId && salePointName && (
              <p className="text-xs text-muted-foreground">
                Sucursal actual: <strong>{salePointName}</strong>
              </p>
            )}
          </div>
          {preview && !previewFetching && (
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Registros a transferir
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-2xl font-black text-foreground">{preview.ticketCount.toLocaleString()}</span>
                  <span className="ml-1.5 text-muted-foreground">tickets</span>
                </div>
                <div>
                  <span className="text-2xl font-black text-foreground">{preview.movementCount.toLocaleString()}</span>
                  <span className="ml-1.5 text-muted-foreground">movimientos</span>
                </div>
              </div>
            </div>
          )}
          {previewFetching && newSalePointId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Calculando registros a transferir...
            </div>
          )}
          {transferMutation.error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {transferMutation.error.message}
            </div>
          )}
        </div>
      ) : editing ? (
        <EditForm
          form={form}
          onChange={set}
          salePoints={salePoints ?? []}
          showPassword={showPassword}
          canEditRole={canEditRole}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onGenerate={handleGenerate}
        />
      ) : transferMode === 'idle' ? (
        <DetailsGrid user={user} salePointName={salePointName} />
      ) : null}
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

      <Field label="Usuario de inicio de sesión" hint="Mínimo 3 caracteres" required>
        <input
          type="text"
          value={form.username}
          onChange={(e) => onChange('username', e.target.value)}
          maxLength={60}
          autoComplete="off"
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
            autoComplete="new-password"
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
    classes: 'bg-purple-500/10 text-purple-700 ring-purple-500/20',
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
