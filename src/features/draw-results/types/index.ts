export interface DrawResult {
  id: string;
  gameId: string;
  drawAt: string;
  winningNumber: string;
  recordedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListDrawResultsParams {
  gameId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDrawResultPayload {
  gameId: string;
  drawAt: string;
  winningNumber: string;
}

export interface UpdateDrawResultPayload {
  winningNumber: string;
}
