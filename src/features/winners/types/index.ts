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
  status: 'valid' | 'voided';
  voidedAt: string | null;
  voidedReason: string | null;
  total: number;
  totalPrize: number;
  count: number;
  drawAt: string;
  cutoffMinutes: number;
  lines: TicketLine[];
  createdAt: string;
  updatedAt: string;
}

/** One line the evaluator considered, with its winning status. */
export interface TicketLineEvaluation {
  label: string;
  amount: number;
  prize: number;
  wonPrize: number;
  isWinner: boolean;
  winningNumber: string | null;
  subGameId: string | null;
  subGameName: string | null;
}

export interface WinningTicket {
  ticket: Ticket;
  totalPrize: number;
  lines: TicketLineEvaluation[];
}

export interface ListWinnersParams {
  gameId?: string;
  salePointId?: string;
  sellerId?: string;
  from?: string;
  to?: string;
  drawTime?: string;
  /** Búsqueda por folio (prefix) o cliente (anywhere). Bypass rango. */
  search?: string;
}
