export interface SaleLimitBySellerNumber {
  id: string;
  salePointId: string;
  sellerId: string;
  gameId: string;
  label: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertSaleLimitBySellerNumberPayload {
  salePointId: string;
  sellerId: string;
  gameId: string;
  label: string;
  amount: number;
}
