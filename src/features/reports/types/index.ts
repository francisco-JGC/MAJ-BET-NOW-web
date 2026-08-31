export interface SellerReportRow {
  sellerId: string;
  sellerName: string;
  /** Teléfono del vendedor para compartir el reporte por WhatsApp. */
  sellerPhone: string | null;
  ticketCount: number;
  voidedCount: number;
  billed: number;
  /** Total ganado por los tickets del vendedor (evaluado contra draws). */
  wonPrize: number;
  paymentPercentage: number | null;
  /** `billed × paymentPercentage / 100` rounded — null when % not set. */
  salary: number | null;
}

export interface SellerReportParams {
  salePointId?: string;
  /** Multi-sucursal (CSV al backend). */
  salePointIds?: string[];
  sellerId?: string;
  /** ISO with Managua offset (`-06:00`). Inclusive. */
  from?: string;
  /** ISO with Managua offset. Inclusive. */
  to?: string;
}

export interface SellerReportResponse {
  items: SellerReportRow[];
}

export interface BranchTotalsRow {
  salePointId: string;
  salePointName: string;
  ownerPartnerId: string | null;
  ownerPartnerName: string | null;
  ticketCount: number;
  voidedCount: number;
  billed: number;
  /** Total premios ganados en el rango (evaluado contra draws). */
  wonPrize: number;
  /** `billed - wonPrize` — revenue after prize obligations. Can be negative. */
  net: number;
}

export interface BranchTotalsParams {
  gameId?: string;
  from?: string;
  to?: string;
}

export interface BranchTotalsResponse {
  items: BranchTotalsRow[];
}

export interface BillingByGameRow {
  gameId: string;
  gameName: string;
  ticketCount: number;
  voidedCount: number;
  billed: number;
  /** Total ganado por tickets del juego (evaluado contra draws). */
  wonPrize: number;
  net: number;
  /** 0..1 — `billed / totalBilled`. */
  share: number;
}

export interface BillingByGameParams {
  salePointId?: string;
  sellerId?: string;
  from?: string;
  to?: string;
}

export interface BillingByGameResponse {
  items: BillingByGameRow[];
}
