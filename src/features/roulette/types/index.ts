export interface RouletteConfig {
  id: string;
  /** null = configuración global, usada por las sucursales sin la suya. */
  salePointId: string | null;
  /** Probabilidad de acertar POR NÚMERO elegido, en basis points (0-10000). */
  winPercentBps: number;
  prizeMultiplier: number;
  /** Permiso: habilita el switch de prueba en la app del vendedor. */
  testMode: boolean;
  /** Retorno al jugador en basis points. Por encima de 10000 la casa pierde. */
  rtpBps: number;
  updatedAt: string;
}

export interface UpsertRouletteConfigPayload {
  salePointId: string | null;
  winPercentBps: number;
  prizeMultiplier: number;
  testMode: boolean;
}

export interface RouletteBoard {
  pockets: string[];
  /** Probabilidad honesta de una ruleta de 38 casillas: 1/38 = 263 bps. */
  fairWinPercentBps: number;
}

export interface RoulettePlay {
  id: string;
  salePointId: string;
  playerId: string;
  numbers: string[];
  amountPerNumber: number;
  totalAmount: number;
  winningNumber: string;
  isWin: boolean;
  prize: number;
  winPercentBps: number;
  prizeMultiplier: number;
  /** Tirada de prueba: no generó factura ni sorteo. */
  isTest: boolean;
  createdAt: string;
}

export interface RoulettePlayTotals {
  plays: number;
  wins: number;
  wagered: number;
  paid: number;
}

export interface ListRoulettePlaysResponse {
  items: RoulettePlay[];
  total: number;
  totals: RoulettePlayTotals;
}

export interface ListRoulettePlaysParams {
  salePointId?: string;
  from?: string;
  to?: string;
  includeTest?: boolean;
  limit: number;
  offset: number;
}
