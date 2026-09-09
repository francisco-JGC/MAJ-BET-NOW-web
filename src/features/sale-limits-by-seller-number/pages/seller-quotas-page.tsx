import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';

import { SellerQuotasSection } from '@/features/sale-limits-by-seller-number/components/seller-quotas-section';
import { useGames } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { useUsers } from '@/features/users/hooks/use-users';
import { UserRole } from '@/features/users/types';
import { Select } from '@/shared/ui/select';

export function SellerQuotasPage() {
  const { data: salePoints = [] } = useSalePoints();
  const { data: games = [] } = useGames();
  const { data: sellersPage } = useUsers({
    role: UserRole.SELLER,
    limit: 500,
    offset: 0,
  });

  const [salePointId, setSalePointId] = useState('');
  const [gameId, setGameId] = useState('');
  const [sellerId, setSellerId] = useState('');

  const handleSalePointChange = (id: string) => {
    setSalePointId(id);
    setGameId('');
    setSellerId('');
  };

  const selectedSalePoint = useMemo(
    () => salePoints.find((sp) => sp.id === salePointId) ?? null,
    [salePoints, salePointId],
  );

  const activeGames = useMemo(
    () => (games ?? []).filter((g) => g.isActive && g.type !== 'multi_sorteo'),
    [games],
  );

  const sellersForSalePoint = useMemo(
    () =>
      (sellersPage?.items ?? []).filter(
        (u) => u.isActive && u.salePointId === salePointId,
      ),
    [sellersPage, salePointId],
  );

  const allSelected = !!salePointId && !!gameId && !!sellerId;

  const emptyMessage = !salePointId
    ? 'Seleccioná una sucursal para continuar.'
    : !gameId
      ? 'Seleccioná un juego para continuar.'
      : 'Seleccioná un vendedor para ver sus cuotas.';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">
          Cuotas por Vendedor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asigná topes individuales a cada vendedor por número y juego.
          Seleccioná una sucursal, un juego y un vendedor para ver sus cuotas.
        </p>
      </header>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="min-w-52 flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Sucursal
          </label>
          <Select
            value={salePointId}
            onChange={handleSalePointChange}
            placeholder="Seleccioná una sucursal"
            options={salePoints.map((sp) => ({ value: sp.id, label: sp.name }))}
          />
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Juego
          </label>
          <Select
            value={gameId}
            onChange={setGameId}
            placeholder="Seleccioná un juego"
            options={activeGames.map((g) => ({ value: g.id, label: g.name }))}
            disabled={!salePointId}
          />
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Vendedor
          </label>
          <Select
            value={sellerId}
            onChange={setSellerId}
            placeholder={
              salePointId
                ? sellersForSalePoint.length === 0
                  ? 'Sin vendedores en esta sucursal'
                  : 'Seleccioná un vendedor'
                : 'Primero elegí una sucursal'
            }
            options={sellersForSalePoint.map((s) => ({
              value: s.id,
              label: s.name,
            }))}
            disabled={!salePointId || sellersForSalePoint.length === 0}
          />
        </div>
      </div>

      {!allSelected ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Users className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : selectedSalePoint ? (
        <SellerQuotasSection
          salePoint={selectedSalePoint}
          gameId={gameId}
          sellerId={sellerId}
        />
      ) : null}
    </div>
  );
}
