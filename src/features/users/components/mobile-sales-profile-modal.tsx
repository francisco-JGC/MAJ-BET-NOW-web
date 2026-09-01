import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { updateMyMobileSalesProfile } from '@/features/users/api/users.api';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useSession } from '@/features/auth/hooks/use-session';
import { toApiError } from '@/shared/api/error-mapper';
import { cn } from '@/shared/lib/cn';
import { Modal } from '@/shared/ui/modal';
import { Select } from '@/shared/ui/select';

import type { User } from '@/features/users/types';
import type { ApiError } from '@/shared/types/api';

/**
 * Configura el "Modo vendedor" del admin: toggle + sucursal donde
 * imputar sus ventas. Solo se abre para role=admin — el UserMenu se
 * encarga de no mostrar la entrada al resto.
 *
 * El estado inicial del form viene del `session.user` (que actualizamos
 * al guardar); si el admin nunca lo configuró, arranca con
 * `mobileSalesEnabled=false` y `defaultSalePointId=null`.
 */
export function MobileSalesProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const session = useSession();
  const qc = useQueryClient();

  const currentUser = session?.user as (User | undefined);

  // Local state — inicializado desde el user actual al abrir el modal,
  // así el admin puede cancelar (Escape / click fuera) sin persistir.
  const [enabled, setEnabled] = useState(false);
  const [salePointId, setSalePointId] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setEnabled(currentUser?.mobileSalesEnabled ?? false);
    setSalePointId(currentUser?.defaultSalePointId ?? '');
  }, [open, currentUser?.mobileSalesEnabled, currentUser?.defaultSalePointId]);

  const { data: salePoints, isLoading: loadingSalePoints } = useSalePoints();
  const activeSalePoints = (salePoints ?? []).filter((sp) => sp.isActive);

  const mutation = useMutation<User, ApiError, void>({
    mutationFn: async () => {
      try {
        return await updateMyMobileSalesProfile({
          mobileSalesEnabled: enabled,
          // Solo mandamos la sucursal si el modo se está activando —
          // el backend ignora el campo cuando enabled=false. Si el
          // admin ya tenía una elegida, la conservamos en el payload
          // para que el server no la limpie por accidente.
          defaultSalePointId: enabled
            ? salePointId || null
            : currentUser?.defaultSalePointId ?? null,
        });
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (updated) => {
      // Invalidamos users list (por si el admin también aparece en la
      // tabla) y refrescamos la sesión — el useSession se hidrata del
      // JWT, así que actualizamos el store manualmente.
      qc.invalidateQueries({ queryKey: ['users'] });
      // Actualiza el session store con los nuevos campos del user.
      if (session) {
        session.user = {
          ...session.user,
          mobileSalesEnabled: updated.mobileSalesEnabled,
          defaultSalePointId: updated.defaultSalePointId,
        } as typeof session.user;
      }
      toast.success(
        enabled
          ? 'Modo vendedor activado'
          : 'Modo vendedor desactivado',
      );
      onClose();
    },
    onError: (error) => {
      toast.error('No se pudo guardar', { description: error.message });
    },
  });

  const canSave =
    (enabled && salePointId.length > 0) || (!enabled);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modo vendedor"
      description="Habilita la venta desde la app móvil con tu cuenta de administrador. Las ventas se imputan a la sucursal que elijas."
      size="max-w-lg"
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
            type="button"
            disabled={!canSave || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition',
              !canSave || mutation.isPending
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-primary/90',
            )}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-4">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 size-4 rounded border-border"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Smartphone className="size-4 text-primary" />
              Habilitar mi cuenta para vender desde el móvil
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Podrás iniciar sesión en la app y crear tickets como si fueras un
              vendedor de la sucursal seleccionada. Tu rol sigue siendo admin.
            </p>
          </div>
        </label>

        <div className={cn('space-y-2', !enabled && 'opacity-50')}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sucursal donde vender
          </label>
          <Select
            value={salePointId}
            onChange={setSalePointId}
            disabled={!enabled || loadingSalePoints}
            leadingIcon={<MapPin className="size-4" />}
            placeholder={
              loadingSalePoints ? 'Cargando…' : 'Elige una sucursal'
            }
            options={activeSalePoints.map((sp) => ({
              value: sp.id,
              label: sp.name,
            }))}
          />
          {enabled && salePointId === '' && (
            <p className="text-xs text-muted-foreground">
              Elige una sucursal para poder guardar.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
