import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Smartphone, X } from 'lucide-react';

import { SidebarNav } from '@/app/layout/sidebar-nav';
import { useSidebarStore } from '@/app/layout/sidebar-store';
import { useLogout, useSession } from '@/features/auth/hooks/use-session';
import { MobileSalesProfileModal } from '@/features/users/components/mobile-sales-profile-modal';
import { UserRole } from '@/features/users/types';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

export function AdminShell() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();

  const isOpen = useSidebarStore((s) => s.isOpen);
  const pinned = useSidebarStore((s) => s.pinned);
  const open = useSidebarStore((s) => s.open);
  const close = useSidebarStore((s) => s.close);
  const togglePinned = useSidebarStore((s) => s.togglePinned);

  // Close the mobile drawer on navigation (desktop pinned state unaffected).
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.login, { replace: true });
  };

  // Hamburger: on desktop toggles pinned (persisted); on mobile opens drawer.
  const handleHamburger = () => {
    if (window.innerWidth >= 768) {
      togglePinned();
    } else {
      open();
    }
  };

  // Sidebar close button: on desktop collapses (unpins); on mobile closes drawer.
  const handleSidebarClose = () => {
    if (window.innerWidth >= 768) {
      togglePinned();
    } else {
      close();
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Backdrop — mobile only */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={close}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar
          Mobile  : slide in/out via isOpen
          Desktop : always visible when pinned, hidden when not (md: overrides mobile class) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-primary transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          pinned ? 'md:translate-x-0' : 'md:-translate-x-full',
        )}
      >
        <SidebarHeader onClose={handleSidebarClose} pinned={pinned} />

        <div className="flex-1 overflow-y-auto">
          {/* onNavigate closes the mobile drawer; on desktop (pinned) calling close()
              sets isOpen=false but the md:translate-x-0 keeps the sidebar visible. */}
          <SidebarNav onNavigate={close} />
        </div>

        <SidebarFooter
          name={session?.user.name ?? '—'}
          role={session?.user.role ?? ''}
          onLogout={handleLogout}
        />
      </aside>

      {/* Content area shifts right on desktop when sidebar is pinned */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding-left] duration-200',
          pinned && 'md:pl-72',
        )}
      >
        <Topbar
          onOpenSidebar={handleHamburger}
          pinned={pinned}
          name={session?.user.name ?? '—'}
          role={session?.user.role ?? ''}
          onLogout={handleLogout}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Topbar({
  onOpenSidebar,
  pinned,
  name,
  role,
  onLogout,
}: {
  onOpenSidebar: () => void;
  pinned: boolean;
  name: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card">
      <div className="flex h-14 items-center gap-3 px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex size-9 items-center justify-center rounded-md text-foreground hover:bg-secondary"
          aria-label={pinned ? 'Colapsar menú' : 'Abrir menú'}
          title={pinned ? 'Colapsar menú' : 'Abrir menú'}
        >
          {/* On desktop show panel icon reflecting pinned state; on mobile always hamburger */}
          <Menu className="size-5 md:hidden" />
          {pinned
            ? <PanelLeftClose className="hidden size-5 md:block" />
            : <PanelLeftOpen className="hidden size-5 md:block" />
          }
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MajbetNow" className="size-9 object-contain" />
          <span className="text-sm font-black tracking-tight">MajbetNow</span>
        </div>

        <UserMenu name={name} role={role} onLogout={onLogout} />
      </div>
    </header>
  );
}

function UserMenu({
  name,
  role,
  onLogout,
}: {
  name: string;
  role: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mobileSalesOpen, setMobileSalesOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = role === UserRole.ADMIN;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition',
          open ? 'bg-secondary' : 'hover:bg-secondary/70',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate text-sm font-semibold text-foreground">
            {name}
          </span>
          <span className="block truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {role}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          strokeWidth={2.4}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-16px_rgba(15,23,42,0.24)]"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="truncate text-sm font-semibold">{name}</div>
            <div className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              {role}
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setMobileSalesOpen(true);
              }}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
            >
              <Smartphone className="size-4 text-muted-foreground" />
              Modo vendedor
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary"
          >
            <LogOut className="size-4 text-muted-foreground" />
            Cerrar sesión
          </button>
        </div>
      )}
      {isAdmin && (
        <MobileSalesProfileModal
          open={mobileSalesOpen}
          onClose={() => setMobileSalesOpen(false)}
        />
      )}
    </div>
  );
}

function SidebarHeader({
  onClose,
  pinned,
}: {
  onClose: () => void;
  pinned: boolean;
}) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
      <img
        src="/logo.png"
        alt="MajbetNow"
        className="size-11 shrink-0 object-contain"
      />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-black leading-tight tracking-tight text-primary-foreground">
          MajbetNow
        </div>
        <div className="text-xs leading-tight text-primary-foreground/60">
          Panel de administración
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-md text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
        aria-label={pinned ? 'Colapsar menú' : 'Cerrar menú'}
        title={pinned ? 'Colapsar menú' : 'Cerrar menú'}
      >
        {/* Mobile: always X; Desktop: PanelLeftClose when pinned */}
        <X className="size-4 md:hidden" />
        <PanelLeftClose className="hidden size-4 md:block" />
      </button>
    </div>
  );
}

function SidebarFooter({
  name,
  role,
  onLogout,
}: {
  name: string;
  role: string;
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-primary-foreground">{name}</div>
          <div className="truncate text-xs uppercase tracking-wide text-primary-foreground/60">
            {role}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex size-8 items-center justify-center rounded-md text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}
