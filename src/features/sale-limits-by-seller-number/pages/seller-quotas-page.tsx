import { useState } from 'react';
import { Users } from 'lucide-react';

import { SellerQuotasSection } from '@/features/sale-limits-by-seller-number/components/seller-quotas-section';
import { useGames } from '@/features/games/hooks/use-games';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { Select } from '@/shared/ui/select';

export function SellerQuotasPage() {
  const { data: salePoints = [] } = useSalePoints();
  const { data: games = [] } = useGames();

  const [salePointId, setSalePointId] = useState('');
  const [gameId, setGameId] = useState('');

  const handleSalePointChange = (id: string) => {
    setSalePointId(id);
    setGameId('');
  };

  const selectedSalePoint =
    salePoints.find((sp) => sp.id === salePointId) ?? null;

  const activeGames = (games ?? []).filter(
    (g) => g.isActive && g.type !== 'multi_sorteo',
  );

  const bothSelected = !!salePointId && !!gameId;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">
          Cuotas por Vendedor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Asigná topes individuales a cada vendedor por número y juego. Seleccioná
          una sucursal y un juego para empezar.
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
      </div>

      {!bothSelected ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <Users className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {!salePointId
              ? 'Seleccioná una sucursal para continuar.'
              : 'Seleccioná un juego para ver las cuotas.'}
          </p>
        </div>
      ) : selectedSalePoint ? (
        <SellerQuotasSection salePoint={selectedSalePoint} gameId={gameId} />
      ) : null}
    </div>
  );
}
