import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  ChevronDown,
  Dices,
  History,
  Home,
  MapPin,
  Receipt,
  Repeat,
  Settings2,
  Shield,
  Trophy,
  User,
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
  roles?: readonly UserRole[];
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  roles?: readonly UserRole[];
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

const ADMIN_ONLY: readonly UserRole[] = [UserRole.ADMIN];

const NAV_ENTRIES: readonly NavEntry[] = [
  { to: APP_ROUTES.home, label: 'Inicio', icon: Home },
  { to: APP_ROUTES.sales, label: 'Facturas', icon: Receipt },
  { to: APP_ROUTES.users, label: 'Usuarios', icon: User },
  { to: APP_ROUTES.winners, label: 'Ganadores', icon: Trophy },
  { to: APP_ROUTES.movements, label: 'Movimientos', icon: Repeat },
  { to: APP_ROUTES.salesByNumber, label: 'Montos Máximos', icon: Shield, roles: ADMIN_ONLY },
  { to: APP_ROUTES.branchFlowReport, label: 'Sumatoria', icon: BarChart3, roles: ADMIN_ONLY },
  { to: APP_ROUTES.movementsCalc, label: 'Cálculo Movimientos', icon: Calculator },
  { to: APP_ROUTES.sucursales, label: 'Sucursales', icon: MapPin },
  {
    label: 'Configuración',
    icon: Settings2,
    roles: ADMIN_ONLY,
    children: [
      { to: APP_ROUTES.draws, label: 'Sorteos', icon: Dices },
      { to: APP_ROUTES.systemConfig, label: 'Sistema', icon: Settings2 },
    ],
  },
  { to: APP_ROUTES.latestResults, label: 'Últimos Resultados', icon: History },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const session = useSession();
  const role = session?.user.role;

  const visible = NAV_ENTRIES.filter((entry) => {
    if (!entry.roles) return true;
    return role !== undefined && entry.roles.includes(role);
  });

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visible.map((entry) =>
        isGroup(entry) ? (
          <SidebarNavGroup key={entry.label} group={entry} onNavigate={onNavigate} />
        ) : (
          <SidebarNavItem key={entry.to} item={entry} onNavigate={onNavigate} />
        ),
      )}
    </nav>
  );
}

function SidebarNavItem({
  item,
  onNavigate,
  compact,
}: {
  item: NavItem;
  onNavigate?: () => void;
  compact?: boolean;
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
          compact && 'px-3 py-2',
          isActive
            ? compact
              ? 'bg-primary/10 font-semibold text-primary'
              : 'bg-white/20 text-primary-foreground shadow-sm shadow-black/20'
            : compact
              ? 'text-foreground/70 hover:bg-primary/5 hover:text-foreground'
              : 'text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-5 shrink-0 transition-colors',
              compact
                ? isActive
                  ? 'text-primary'
                  : 'text-foreground/50 group-hover:text-foreground'
                : isActive
                  ? 'text-primary-foreground'
                  : 'text-primary-foreground/60 group-hover:text-primary-foreground',
            )}
            strokeWidth={isActive ? 2.4 : 2}
          />
          <span className={cn('truncate font-medium', isActive && 'font-semibold')}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

function SidebarNavGroup({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const anyChildActive = group.children.some((c) => location.pathname === c.to);
  const [open, setOpen] = useState(anyChildActive);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = group.icon;

  // Close when clicking outside the group (within the sidebar)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChildNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
          anyChildActive || open
            ? 'bg-white/20 text-primary-foreground shadow-sm shadow-black/20'
            : 'text-primary-foreground/70 hover:bg-white/10 hover:text-primary-foreground',
        )}
      >
        <Icon
          className={cn(
            'size-5 shrink-0 transition-colors',
            anyChildActive || open
              ? 'text-primary-foreground'
              : 'text-primary-foreground/60 group-hover:text-primary-foreground',
          )}
          strokeWidth={anyChildActive ? 2.4 : 2}
        />
        <span className={cn('truncate font-medium flex-1 text-left', anyChildActive && 'font-semibold')}>
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
            anyChildActive || open ? 'text-primary-foreground/80' : 'text-primary-foreground/40',
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="mx-2 mt-1 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5">
          {group.children.map((child) => (
            <SidebarNavItem
              key={child.to}
              item={child}
              onNavigate={handleChildNavigate}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
