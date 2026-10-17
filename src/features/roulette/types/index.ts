export interface RouletteConfig {
  id: string;
  /** null = configuración global, usada por las sucursales sin la suya. */
  salePointId: string | null;
  /** Probabilidad de acertar POR NÚMERO elegido, en basis points (0-10000). */
  winPercentBps: number;
  prizeMultiplier: number;
  /** Retorno al jugador en basis points. Por encima de 10000 la casa pierde. */
  rtpBps: number;
  updatedAt: string;
}

export interface UpsertRouletteConfigPayload {
  salePointId: string | null;
  winPercentBps: number;
  prizeMultiplier: number;
}

export interface RouletteBoard {
  pockets: string[];
  /** Probabilidad honesta de una ruleta de 38 casillas: 1/38 = 263 bps. */
  fairWinPercentBps: number;
}
