/**
 * Central route registry. Every navigation goes through here so we avoid
 * magic strings scattered across pages and hooks.
 */
export const APP_ROUTES = {
  root: '/',
  login: '/login',

  // Admin panel routes (sidebar order matches this file).
  home: '/inicio',
  sales: '/facturas',
  branchTotals: '/totales-sucursal',
  sellerReport: '/reporte-vendedor',
  branchFlowReport: '/sumatoria',
  billing: '/facturacion',
  salesByNumber: '/montos-maximos',
  winners: '/ganadores',
  movements: '/movimientos',
  movementsCalc: '/calculo-movimientos',
  users: '/usuarios',
  sucursales: '/sucursales',
  sucursalConfig: '/sucursales/:id/configuracion',
  draws: '/sorteos',
  latestResults: '/ultimos-resultados',
  systemConfig: '/configuracion-sistema',
} as const;

/** Concrete `/sucursales/{id}/configuracion` URL for navigation. */
export function sucursalConfigPath(id: string): string {
  return `/sucursales/${id}/configuracion`;
}
