import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  CircleDollarSign,
  Dices,
  Hash,
  History,
  Home,
  MapPin,
  PlusSquare,
  Receipt,
  Repeat,
  Settings2,
  ShieldAlert,
  Trophy,
  User,
  UserSearch,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useSession } from '@/features/auth/hooks/use-session';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

import { UserRole } from '@/features/auth/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * Which roles can see this item. Omit to show to every web-eligible role
   * (admin + partner). Sellers never reach the sidebar — they use mobile.
   */
  roles?: readonly UserRole[];
}

// Config-only items (games, resultados globales) stay admin-only. Partners
// see the operational stuff they need to run their sucursales.
const ADMIN_ONLY: readonly UserRole[] = [UserRole.ADMIN];

const NAV_ITEMS: readonly NavItem[] = [
  { to: APP_ROUTES.home, label: 'Inicio', icon: Home },
  { to: APP_ROUTES.sales, label: 'Ventas', icon: Receipt },
  {
    to: APP_ROUTES.branchTotals,
    label: 'Totales Por Sucursal',
    icon: CircleDollarSign,
  },
  {
    to: APP_ROUTES.sellerReport,
    label: 'Reporte Diario Vendedor',
    icon: UserSearch,
  },
  {
    to: APP_ROUTES.branchFlowReport,
    label: 'Reporte Flujo Sucursal',
    icon: BarChart3,
  },
  {
    to: APP_ROUTES.billing,
    label: 'Facturación Por Apuestas',
    icon: PlusSquare,
  },
  {
    to: APP_ROUTES.salesByNumber,
    label: 'Ventas Por Número',
    icon: Hash,
  },
  { to: APP_ROUTES.winners, label: 'Ganadores', icon: Trophy },
  { to: APP_ROUTES.expenses, label: 'Gastos', icon: Wallet },
  { to: APP_ROUTES.movements, label: 'Movimientos', icon: Repeat },
  {
    to: APP_ROUTES.movementsCalc,
    label: 'Cálculo Movimientos',
    icon: Calculator,
  },
  { to: APP_ROUTES.users, label: 'Usuarios', icon: User },
  { to: APP_ROUTES.sucursales, label: 'Sucursales', icon: MapPin },
  {
    to: APP_ROUTES.draws,
    label: 'Sorteos',
    icon: Dices,
    roles: ADMIN_ONLY,
  },
  {
    to: APP_ROUTES.saleLimits,
    label: 'Límites de Venta',
    icon: ShieldAlert,
    roles: ADMIN_ONLY,
  },
  {
    to: APP_ROUTES.latestResults,
    label: 'Últimos Resultados',
    icon: History,
  },
  {
    to: APP_ROUTES.systemConfig,
    label: 'Configuración del sistema',
    icon: Settings2,
    roles: ADMIN_ONLY,
  },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession();
  const role = session?.user.role;
  const visible = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return role !== undefined && item.roles.includes(role);
  });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {visible.map((item) => (
        <SidebarNavItem key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function SidebarNavItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
            : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-5 shrink-0 transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-foreground/60 group-hover:text-foreground',
            )}
            strokeWidth={isActive ? 2.4 : 2}
          />
          <span
            className={cn('truncate font-medium', isActive && 'font-semibold')}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}
