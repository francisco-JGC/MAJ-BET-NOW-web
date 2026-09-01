export const MovementType = {
  EXPENSE: 'expense',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  OPENING: 'opening',
  CLOSING: 'closing',
  ADJUSTMENT: 'adjustment',
} as const;

export type MovementType = (typeof MovementType)[keyof typeof MovementType];

export interface Movement {
  id: string;
  salePointId: string | null;
  sellerId: string | null;
  isPrizePayment: boolean;
  type: MovementType;
  amount: number;
  description: string;
  occurredAt: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovementsBalanceRow {
  salePointId: string;
  salePointName: string;
  ownerPartnerId: string | null;
  ownerPartnerName: string | null;
  /** Teléfono del encargado para compartir el reporte por WhatsApp. */
  ownerPartnerPhone: string | null;
  /** % semanal configurado en la sucursal para el encargado. */
  partnerPaymentPercentage: number | null;
  /**
   * Salario del encargado sobre las ventas de la sucursal en el rango:
   * `round(billed * partnerPaymentPercentage / 100)`. `null` cuando no hay
   * encargado o sin % configurado.
   */
  partnerSalary: number | null;
  billed: number;
  /**
   * Total ganado por los tickets del rango (evaluado contra draws).
   * "Lo que debería entregar" en la UI. Usado en el cálculo de `net`.
   */
  wonPrize: number;
  deposits: number;
  withdrawals: number;
  expenses: number;
  /** net = billed - wonPrize + deposits - withdrawals - expenses */
  net: number;
}

export interface MovementsBalanceParams {
  salePointId?: string;
  /** Multi-sucursal (se serializa como CSV al backend). */
  salePointIds?: string[];
  from?: string;
  to?: string;
}

export interface MovementsBalanceResponse {
  items: MovementsBalanceRow[];
}

export interface ListMovementsParams {
  salePointId?: string;
  type?: MovementType;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface ListMovementsResponse {
  items: Movement[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateMovementPayload {
  /** Required for sucursal movements. Omit when sellerId is provided. */
  salePointId?: string;
  /** When set, creates a seller-level movement. */
  sellerId?: string;
  isPrizePayment?: boolean;
  type: MovementType;
  amount: number;
  description?: string;
  /** ISO 8601. Optional — server defaults to now. */
  occurredAt?: string;
  clientRequestId?: string;
}

export interface SellerMovementsBalanceRow {
  sellerId: string;
  /** SUM of DEPOSIT movements to this seller (admin collected from seller). */
  cobros: number;
  /** SUM of WITHDRAWAL movements (admin gave back to seller). */
  credits: number;
  /** SUM of movements flagged as prize payments. */
  prizePayments: number;
}

export interface SellerMovementsBalanceParams {
  salePointIds?: string[];
  from?: string;
  to?: string;
}

export interface SellerMovementsBalanceResponse {
  items: SellerMovementsBalanceRow[];
}

export type BranchFlowKind = 'ticket_sale' | 'prize_payout' | 'movement';

export interface BranchFlowItem {
  kind: BranchFlowKind;
  at: string;
  amount: number;
  folio: string | null;
  movementType: MovementType | null;
  description: string;
  refId: string;
}

export interface BranchFlowParams {
  /** Mandatory — the report only makes sense per-sucursal. */
  salePointId: string;
  from?: string;
  to?: string;
}

export interface BranchFlowResponse {
  items: BranchFlowItem[];
}
