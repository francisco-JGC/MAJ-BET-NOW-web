import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleDot, Loader2, Save } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import {
  useRouletteBoard,
  useRouletteConfig,
  useUpsertRouletteConfig,
} from '@/features/roulette/hooks/use-roulette';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { UserRole } from '@/features/users/types';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

const GLOBAL = '__global__';

/** 10000 bps = 100%. La UI habla en %, el backend en basis points. */
const bpsToPercent = (bps: number) => bps / 100;
const percentToBps = (percent: number) => Math.round(percent * 100);

export function RouletteConfigPage() {
  const session = useSession();
  const { data: salePoints } = useSalePoints();
  const { data: board } = useRouletteBoard();
  const upsert = useUpsertRouletteConfig();

  const [scope, setScope] = useState<string>(GLOBAL);
  const salePointId = scope === GLOBAL ? null : scope;

  // La config global no tiene endpoint de lectura propio: se resuelve
  // pidiendo la de cualquier sucursal sin override. Para leerla usamos la
  // primera sucursal como sonda — el backend cae al fallback global.
  const probeId = salePointId ?? salePoints?.[0]?.id ?? null;
  const { data: config, isLoading } = useRouletteConfig(probeId);

  const [winPercent, setWinPercent] = useState('');
  const [multiplier, setMultiplier] = useState('');

  useEffect(() => {
    if (!config) return;
    setWinPercent(String(bpsToPercent(config.winPercentBps)));
    setMultiplier(String(config.prizeMultiplier));
  }, [config]);

  const parsedPercent = Number.parseFloat(winPercent);
  const parsedMultiplier = Number.parseInt(multiplier, 10);
  const valid =
    Number.isFinite(parsedPercent) &&
    parsedPercent >= 0 &&
    parsedPercent <= 100 &&
    Number.isInteger(parsedMultiplier) &&
    parsedMultiplier >= 1;

  /**
   * Las dos perillas están acopladas: `RTP = probabilidad × (multiplicador + 1)`.
   * Se calcula en vivo porque el error que importa — dejar la casa en
   * números rojos — no se nota mirando los inputs por separado.
   */
  const rtp = useMemo(() => {
    if (!valid) return null;
    return (parsedPercent / 100) * (parsedMultiplier + 1);
  }, [valid, parsedPercent, parsedMultiplier]);

  const fairPercent = board ? bpsToPercent(board.fairWinPercentBps) : 2.63;
  const houseLoses = rtp !== null && rtp > 1;

  function handleSave() {
    if (!valid) return;
    upsert.mutate({
      salePointId,
      winPercentBps: percentToBps(parsedPercent),
      prizeMultiplier: parsedMultiplier,
    });
  }

  if (session && session.user.role !== UserRole.ADMIN) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <CircleDot className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-black tracking-tight">Ruleta</h1>
      </header>

      <p className="max-w-2xl text-sm text-muted-foreground">
        La ruleta tiene {board?.pockets.length ?? 38} casillas (0, 00 y 1 al
        36). El porcentaje es la probabilidad de acertar{' '}
        <strong>por cada número elegido</strong>: si el jugador marca 5
        números, su chance es 5 veces ese valor. En una ruleta real el valor
        es {fairPercent.toFixed(2)}% (1 de {board?.pockets.length ?? 38}).
      </p>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aplicar a
        </label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="mt-1.5 w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value={GLOBAL}>Todas las sucursales (global)</option>
          {(salePoints ?? []).map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          La configuración de una sucursal pisa a la global. Las sucursales
          sin configuración propia usan la global.
        </p>

        {isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="% de victoria por número"
                hint={`Ruleta real: ${fairPercent.toFixed(2)}%`}
              >
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={winPercent}
                  onChange={(e) => setWinPercent(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Multiplicador del premio" hint="Por defecto 35x">
                <input
                  type="number"
                  step="1"
                  min={1}
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <RtpPanel rtp={rtp} houseLoses={houseLoses} />

            <button
              type="button"
              onClick={handleSave}
              disabled={!valid || upsert.isPending}
              className={cn(
                'mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                valid
                  ? 'bg-primary text-primary-foreground hover:brightness-105'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              {upsert.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RtpPanel({ rtp, houseLoses }: { rtp: number | null; houseLoses: boolean }) {
  if (rtp === null) {
    return (
      <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Completá los dos campos para ver el retorno al jugador.
      </div>
    );
  }
  const margin = 1 - rtp;
  return (
    <div
      className={cn(
        'mt-5 rounded-xl border px-4 py-3',
        houseLoses
          ? 'border-rose-300 bg-rose-50'
          : 'border-emerald-300 bg-emerald-50',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Metric label="Retorno al jugador" value={`${(rtp * 100).toFixed(1)}%`} />
        <Metric
          label="Margen de la casa"
          value={`${(margin * 100).toFixed(1)}%`}
        />
      </div>
      {houseLoses && (
        <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-rose-700">
          <AlertTriangle className="mt-px size-4 shrink-0" />
          Con estos valores el jugador recibe más de lo que apuesta: la casa
          pierde plata en cada jugada, a la larga sin excepción.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
