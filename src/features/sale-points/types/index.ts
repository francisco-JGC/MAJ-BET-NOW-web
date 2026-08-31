export interface SalePoint {
  id: string;
  name: string;
  code: string;
  /** Encargado de la sucursal — user with role=partner, 1 per sucursal. */
  ownerPartnerId: string | null;
  /**
   * Socios asignados: additional partners (N per sucursal) that get
   * read-only visibility on this sucursal (dashboards, reports).
   */
  assignedPartnerIds: string[];
  /**
   * % de las ventas semanales que se le paga al encargado. `null` = sin
   * pago configurado. Rango 0–100 (entero).
   */
  partnerPaymentPercentage: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalePointPayload {
  name: string;
  code: string;
  ownerPartnerId?: string;
  partnerPaymentPercentage?: number | null;
}

export interface UpdateSalePointPayload {
  name?: string;
  code?: string;
  ownerPartnerId?: string | null;
  partnerPaymentPercentage?: number | null;
}

export interface SetAssignedPartnersPayload {
  partnerIds: string[];
}
