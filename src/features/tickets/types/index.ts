export type TicketStatus = 'valid' | 'voided';

export interface TicketLine {
  label: string;
  amount: number;
  prize: number;
  subGameId: string | null;
  subGameName: string | null;
  orderIndex: number;
}

export interface Ticket {
  id: string;
  folio: string;
  gameId: string;
  salePointId: string;
  sellerId: string;
  client: string | null;
  status: TicketStatus;
  voidedAt: string | null;
  voidedReason: string | null;
  total: number;
  totalPrize: number;
  count: number;
  drawAt: string;
  cutoffMinutes: number;
  drawExecuted: boolean;
  /** Premio ganado (evaluado contra draw_result). 0 si no ganó o si el sorteo aún no se ejecutó. */
  wonPrize: number;
  lines: TicketLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ListTicketsParams {
  salePointId?: string;
  gameId?: string;
  sellerId?: string;
  status?: TicketStatus;
  /** ISO 8601 with Managua offset (`-06:00`) — start of range, inclusive. */
  from?: string;
  /** ISO 8601 with Managua offset — end of range, inclusive. */
  to?: string;
  /** "HH:MM" wall clock in Managua — filter by draw schedule time. */
  drawTime?: string;
  /**
   * Búsqueda por folio (prefix) o cliente (anywhere), case-insensitive.
   * Cuando viene, el backend ignora `from`/`to`/`drawTime` — el objetivo
   * es encontrar el ticket sin importar cuándo se emitió.
   */
  search?: string;
}

export interface ListTicketsResponse {
  items: Ticket[];
  /** Cantidad total (mismo que `items.length` — el endpoint no pagina). */
  total: number;
  /** Suma de `total` (facturado) sobre TODOS los items válidos. */
  totalBilled: number;
  /** Suma de `wonPrize` (evaluado contra draw_results) sobre TODOS los items. */
  totalWonPrize: number;
}

export interface VoidTicketPayload {
  /** Motivo — opcional. Vacío/omitido se persiste como `null` en el backend. */
  reason?: string;
}
