import { ExternalLink, Trophy } from 'lucide-react';

import { formatCurrency } from '@/shared/lib/format';
import { Modal } from '@/shared/ui/modal';

import type { WinningTicket } from '@/features/winners/types';

interface Props {
  winner: WinningTicket | null;
  gameName: string | null;
  sellerName: string | null;
  salePointName: string | null;
  onClose: () => void;
  /**
   * Opcional. Si se provee, se muestra un ícono al lado del folio que
   * cierra este modal y abre el detalle completo del ticket de venta.
   */
  onViewTicket?: () => void;
}

export function WinnerDetailsModal({
  winner,
  gameName,
  sellerName,
  salePointName,
  onClose,
  onViewTicket,
}: Props) {
  if (!winner) return null;

  const { ticket, totalPrize, lines } = winner;

  const drawAt = new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(ticket.drawAt));

  const winningLines = lines.filter((l) => l.isWinner);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Boleto #${ticket.folio}`}
      description={`${gameName ?? 'Juego'} · ${drawAt}`}
      size="max-w-2xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
        >
          Cerrar
        </button>
      }
    >
      <div className="space-y-5">
        {/* Prize card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/80">
                <Trophy className="size-4" strokeWidth={2.6} />
                Premio total
              </div>
              <p className="mt-1 text-4xl font-black tracking-tight">
                {formatCurrency(totalPrize)}
              </p>
            </div>
            {onViewTicket && (
              <div className="relative z-10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onViewTicket}
                  title="Ver detalles completos del ticket"
                  aria-label="Ver detalles completos del ticket"
                  className="inline-flex size-8 items-center justify-center rounded-lg bg-white/20 text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/30"
                >
                  <ExternalLink className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute -right-8 -bottom-8 size-32 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaRow label="Cliente" value={ticket.client ?? '—'} />
          <MetaRow label="Vendedor" value={sellerName ?? '—'} />
          <MetaRow label="Puesto" value={salePointName ?? '—'} />
          <MetaRow
            label="Total apostado"
            value={formatCurrency(ticket.total)}
          />
        </div>

        {/* Winning lines */}
        <section>
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
            Jugadas ganadoras ({winningLines.length})
          </h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Número</th>
                  <th className="px-4 py-2">Sub-juego</th>
                  <th className="px-4 py-2 text-right">Apostado</th>
                  <th className="px-4 py-2 text-right">Ganado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {winningLines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-black text-white">
                          {line.label}
                        </span>
                        {line.winningNumber && (
                          <span className="text-xs text-muted-foreground">
                            (sorteo: {line.winningNumber})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {line.subGameName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatCurrency(line.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700">
                      {formatCurrency(line.wonPrize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}
