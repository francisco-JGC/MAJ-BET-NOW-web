export interface EffectiveGamePrize {
  gameId: string;
  /**
   * Slug del juego. Se usa para gatear campos que son específicos de un
   * juego, no de un tipo — como "premio par", que solo aplica a Juega 3
   * aunque otros THREE_DIGIT existen (Gana 3, Tresmonazo).
   */
  gameSlug: string;
  gameName: string;
  gameType: string;
  exactDefault: number | null;
  easyDefault: number | null;
  /**
   * Only meaningful for THREE_DIGIT games — null on every other type.
   * Even on THREE_DIGIT it may be null when the pair rule is disabled at
   * the game level. In that case an admin can still set a per-sucursal
   * override to enable the rule for just that sucursal.
   */
  pairEasyDefault: number | null;
  /** Effective value: override if present, otherwise game default. */
  exactMultiplier: number | null;
  easyMultiplier: number | null;
  pairEasyMultiplier: number | null;
  overrideId: string | null;
  overrideExact: number | null;
  overrideEasy: number | null;
  overridePairEasy: number | null;
  hasOverride: boolean;
}

export interface ListEffectiveGamePrizesResponse {
  items: EffectiveGamePrize[];
}

export interface UpsertGamePrizePayload {
  salePointId: string;
  gameId: string;
  exactMultiplier: number | null;
  easyMultiplier: number | null;
  pairEasyMultiplier: number | null;
}
