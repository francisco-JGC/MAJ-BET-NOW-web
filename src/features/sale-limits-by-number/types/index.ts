export interface SaleLimitByNumber {
  id: string;
  salePointId: string;
  gameId: string;
  label: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSaleLimitByNumberPayload {
  salePointId: string;
  gameId: string;
  label: string;
  amount: number;
}
