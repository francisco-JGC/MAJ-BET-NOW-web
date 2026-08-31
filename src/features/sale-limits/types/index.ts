export interface SaleLimit {
  id: string;
  gameId: string;
  salePointId: string;
  /** Cap in centavos per number per draw. */
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSaleLimitPayload {
  gameId: string;
  salePointId: string;
  amount: number;
}
