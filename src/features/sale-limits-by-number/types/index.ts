export interface SaleLimitByNumber {
  id: string;
  salePointId: string;
  gameId: string;
  label: string;
  amount: number;
  minAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSaleLimitByNumberPayload {
  salePointId: string;
  gameId: string;
  label: string;
  amount: number;
  minAmount?: number | null;
}
