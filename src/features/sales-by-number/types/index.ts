export interface SalesByNumberRow {
  gameId: string;
  gameName: string;
  /**
   * Label crudo del número apostado — formato depende del juego:
   *  - regular: "42"
   *  - threeDigit: "123" o "123 (F)" para fácil
   *  - fourDigit: "1234"
   *  - date: "05-08"
   */
  label: string;
  ticketCount: number;
  totalAmount: number;
}

export interface SalesByNumberResponse {
  items: SalesByNumberRow[];
}

export interface SalesByNumberParams {
  salePointId?: string;
  gameId?: string;
  sellerId?: string;
  /** ISO 8601 con offset — inicio del rango, inclusivo. */
  from?: string;
  /** ISO 8601 con offset — fin del rango, exclusivo (backend usa `<`). */
  to?: string;
}
