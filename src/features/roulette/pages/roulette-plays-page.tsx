import { useMemo, useState } from 'react';
import { CircleDot, FlaskConical, Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { useSession } from '@/features/auth/hooks/use-session';
import { useRoulettePlays } from '@/features/roulette/hooks/use-roulette';
import { useSalePoints } from '@/features/sale-points/hooks/use-sale-points';
import { UserRole } from '@/features/users/types';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';

const PAGE_SIZE = 50;

export function RoulettePlaysPage() {
  const session = useSession();
  const { data: salePoints } = useSalePoints();

  const [salePointId, setSalePointId] = useState('');
  const [includeTest, setIncludeTest] = useState(true);
  const [page, setPage] = useState(0);

  const params = useMemo(
    () => ({
      salePointId: salePointId || undefined,
      includeTest,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [salePointId, includeTest, page],
  );

  const { data, isLoading, error } = useRoulettePlays(params);
  const totals = data?.totals;

  // El retorno real observado, contra el configurado. Es el número que
  // dice si la ruleta está pagando lo que debería.
  const realRtp =
    totals && totals.wagered > 0 ? totals.paid / totals.wagered : null;

  if (session && session.user.role !== UserRole.ADMIN) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <CircleDot className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-black tracking-tight">
          Jugadas de ruleta
        </h1>
      </header>

      <p className="max-w-2xl text-sm text-muted-foreground">
        Historial completo, incluidas las tiradas de prueba — que se
        registran para auditoría pero no generan factura ni sorteo. Las
        tiradas reales sí aparecen en facturación y en la cuenta del
        vendedor.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sucursal
          </label>
          <select
            value={salePointId}
            onChange={(e) => {
              setSalePointId(e.target.value);
              setPage(0);
            }}
            className="mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {(salePoints ?? []).map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={includeTest}
            onChange={(e) => {
              setIncludeTest(e.target.checked);
              setPage(0);
            }}
            className="size-4 accent-amber-600"
          />
          Incluir tiradas de prueba
        </label>
      </div>

      {totals && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Tiradas" value={String(totals.plays)} />
          <Stat label="Ganadas" value={String(totals.wins)} />
          <Stat label="Apostado" value={formatCurrency(totals.wagered)} />
          <Stat
            label="Pagado"
            value={formatCurrency(totals.paid)}
            hint={
              realRtp !== null
                ? `retorno real ${(realRtp * 100).toFixed(1)}%`
                : undefined
            }
            tone={realRtp !== null && realRtp > 1 ? 'rose' : 'default'}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No hay jugadas con estos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Números</Th>
                  <Th className="text-right">Apostado</Th>
                  <Th className="text-center">Salió</Th>
                  <Th className="text-right">Premio</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.items ?? []).map((p) => (
                  <tr
                    key={p.id}
                    className={cn(p.isTest && 'bg-amber-50/60')}
                  >
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleString('es-NI')}
                    </Td>
                    <Td>
                      {p.isTest ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-500/30">
                          <FlaskConical className="size-3" />
                          Prueba
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-500/30">
                          Real
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.numbers.map((n) => (
                          <span
                            key={n}
                            className={cn(
                              'rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
                              n === p.winningNumber
                                ? 'bg-emerald-500 text-white'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatCurrency(p.totalAmount)}
                    </Td>
                    <Td className="text-center font-mono font-black">
                      {p.winningNumber}
                    </Td>
                    <Td
                      className={cn(
                        'text-right tabular-nums font-bold',
                        p.isWin ? 'text-emerald-700' : 'text-muted-foreground',
                      )}
                    >
                      {p.isWin ? formatCurrency(p.prize) : '—'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(data?.total ?? 0) > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, data?.total ?? 0)} de{' '}
            {data?.total}
          </span>
          <div className="flex gap-2">
            <PageBtn disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </PageBtn>
            <PageBtn
              disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'rose';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card px-4 py-3',
        tone === 'rose' ? 'border-rose-300 bg-rose-50' : 'border-border',
      )}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-black tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn('px-4 py-2.5 font-semibold', className)}>{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('px-4 py-2.5', className)}>{children}</td>;
}

function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
    >
      {children}
    </button>
  );
}
