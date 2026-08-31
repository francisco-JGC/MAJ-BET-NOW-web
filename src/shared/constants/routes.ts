/**
 * Central route registry. Every navigation goes through here so we avoid
 * magic strings scattered across pages and hooks.
 */
export const APP_ROUTES = {
  root: '/',
  login: '/login',

  // Admin panel routes (sidebar order matches this file).
  home: '/inicio',
  sales: '/ventas',
  branchTotals: '/totales-sucursal',
  sellerReport: '/reporte-vendedor',
  branchFlowReport: '/reporte-flujo-sucursal',
  billing: '/facturacion',
  salesByNumber: '/ventas-por-numero',
  winners: '/ganadores',
  expenses: '/gastos',
  movements: '/movimientos',
  movementsCalc: '/calculo-movimientos',
  users: '/usuarios',
  sucursales: '/sucursales',
  sucursalConfig: '/sucursales/:id/configuracion',
  draws: '/sorteos',
  saleLimits: '/limites-venta',
  latestResults: '/ultimos-resultados',
  systemConfig: '/configuracion-sistema',
} as const;

/** Concrete `/sucursales/{id}/configuracion` URL for navigation. */
export function sucursalConfigPath(id: string): string {
  return `/sucursales/${id}/configuracion`;
}
