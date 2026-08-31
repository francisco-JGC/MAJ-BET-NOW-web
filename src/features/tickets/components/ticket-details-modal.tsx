import { useEffect, useState } from 'react';
import {
  Ban,
  Calendar,
  Clock,
  Dices,
  Handshake,
  Loader2,
  MapPin,
  Receipt,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { useSession } from '@/features/auth/hooks/use-session';
import { useVoidTicket } from '@/features/tickets/hooks/use-tickets';
import { cn } from '@/shared/lib/cn';
import { formatCurrency } from '@/shared/lib/format';
import { Modal } from '@/shared/ui/modal';

import type { Ticket, TicketStatus } from '@/features/tickets/types';
import { UserRole } from '@/features/users/types';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  gameName: string | null;
  salePointName: string | null;
  sellerName: string | null;
}

const MANAGUA = 'America/Managua';
const FULL_FMT = new Intl.DateTimeFormat('es-NI', {
  timeZone: MANAGUA,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function formatFull(iso: string): string {
  return FULL_FMT.format(new Date(iso));
}

export function TicketDetailsModal({
  open,
  onClose,
  ticket,
  gameName,
  salePointName,
  sellerName,
}: Props) {
  const session = useSession();
  const isAdmin = session?.user.role === UserRole.ADMIN;

  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState('');
  const { mutateAsync, isPending, error, reset } = useVoidTicket();

  useEffect(() => {
    if (open) {
      setVoiding(false);
      setReason('');
      reset();
    }
  }, [open, ticket?.id, reset]);

  if (!ticket) return null;

  const canVoid =
    isAdmin && ticket.status === 'valid' && !ticket.drawExecuted;

  const handleVoid = async () => {
    if (isPending) return;
    // Motivo opcional — si el user no lo escribe, mandamos string vacío
    // y el backend lo persiste como `voided_reason = null`.
    await mutateAsync({
      id: ticket.id,
      payload: { reason: reason.trim() },
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalles del ticket"
      size="max-w-2xl"
      footer={
        voiding ? (
          <>
            <button
              type="button"
              onClick={() => {
                setVoiding(false);
                setReason('');
                reset();
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleVoid}
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition',
                isPending
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-rose-700',
              )}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Ban className="size-4" strokeWidth={2.4} />
              )}
              Confirmar anulación
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
            {canVoid && (
              <button
                type="button"
                onClick={() => setVoiding(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                <Ban className="size-4" strokeWidth={2.4} />
                Anular ticket
              </button>
            )}
          </>
        )
      }
    >
      <TicketHeader
        ticket={ticket}
        gameName={gameName}
        salePointName={salePointName}
      />

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {voiding ? (
        <div className="mt-5 space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Motivo de anulación{' '}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Escribí la razón (opcional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          <p className="text-xs text-muted-foreground/70">
            Esta acción no se puede revertir. Los tickets anulados no se pagan
            aunque salgan ganadores.
          </p>
        </div>
      ) : (
        <>
          <InfoGrid
            ticket={ticket}
            gameName={gameName}
            salePointName={salePointName}
            sellerName={sellerName}
          />
          <div className="mt-6 border-t border-border pt-5">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">Líneas</h3>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {ticket.lines.length}
              </span>
            </div>
            <ul className="divide-y divide-border/60 rounded-lg border border-border bg-card">
              {ticket.lines.map((line) => (
                <li
                  key={line.orderIndex}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {line.label}
                    </div>
                    {line.subGameName && (
                      <div className="text-xs text-muted-foreground">
                        {line.subGameName}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        Apuesta
                      </div>
                      <div className="text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrency(line.amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        Premio
                      </div>
                      <div className="text-sm font-semibold text-indigo-700 tabular-nums">
                        {formatCurrency(line.prize)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-border/60">
              <span className="text-sm font-semibold text-foreground">
                Total facturado
              </span>
              <span className="text-lg font-black tabular-nums text-foreground">
                {formatCurrency(ticket.total)}
              </span>
            </div>
          </div>

          {ticket.status === 'voided' && (
            <div className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                {ticket.voidedReason ? 'Motivo de anulación' : 'Anulado'}
              </div>
              {ticket.voidedReason && (
                <div className="mt-1 text-sm text-rose-900">
                  {ticket.voidedReason}
                </div>
              )}
              {ticket.voidedAt && (
                <div className="mt-2 text-xs text-rose-700/70">
                  Anulado el {formatFull(ticket.voidedAt)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function TicketHeader({
  ticket,
  gameName,
  salePointName,
}: {
  ticket: Ticket;
  gameName: string | null;
  salePointName: string | null;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50/60 p-4 ring-1 ring-inset ring-border/60">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <Receipt className="size-5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0">
          <div className="truncate font-mono text-base font-black tracking-tight">
            {ticket.folio}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {gameName && <span>{gameName}</span>}
            {salePointName && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{salePointName}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <StatusChip status={ticket.status} />
    </div>
  );
}

function InfoGrid({
  ticket,
  gameName,
  salePointName,
  sellerName,
}: {
  ticket: Ticket;
  gameName: string | null;
  salePointName: string | null;
  sellerName: string | null;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      <ReadRow label="Juego" icon={<Dices className="size-3.5" />}>
        {gameName ?? <Empty />}
      </ReadRow>
      <ReadRow label="Sorteo" icon={<Clock className="size-3.5" />}>
        {formatFull(ticket.drawAt)}
      </ReadRow>
      <ReadRow label="Sucursal" icon={<MapPin className="size-3.5" />}>
        {salePointName ?? <Empty />}
      </ReadRow>
      <ReadRow label="Vendedor" icon={<UserRound className="size-3.5" />}>
        {sellerName ?? <Empty />}
      </ReadRow>
      <ReadRow label="Cliente" icon={<Handshake className="size-3.5" />}>
        {ticket.client ?? <Empty />}
      </ReadRow>
      <ReadRow label="Creado" icon={<Calendar className="size-3.5" />}>
        {formatFull(ticket.createdAt)}
      </ReadRow>
    </dl>
  );
}

function ReadRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/60">—</span>;
}

function StatusChip({ status }: { status: TicketStatus }) {
  return status === 'valid' ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/20">
      <ShieldCheck className="size-3" strokeWidth={2.6} />
      Válido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-500/20">
      <X className="size-3" strokeWidth={2.6} />
      Anulado
    </span>
  );
}
