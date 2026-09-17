export interface SaleLimit {
  id: string;
  gameId: string;
  salePointId: string;
  /** Cap in centavos per number per draw. */
  amount: number;
  /** Max bet in centavos per individual ticket line. null = no cap. */
  maxPerTicket: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSaleLimitPayload {
  gameId: string;
  salePointId: string;
  amount: number;
  maxPerTicket?: number | null;
}
