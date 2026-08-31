import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';

import { SidebarNav } from '@/app/layout/sidebar-nav';
import { useSidebarStore } from '@/app/layout/sidebar-store';
import { useLogout, useSession } from '@/features/auth/hooks/use-session';
import { APP_ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/lib/cn';

export function AdminShell() {
  const session = useSession();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const openSidebar = useSidebarStore((s) => s.open);
  const closeSidebar = useSidebarStore((s) => s.close);

  // Close the drawer whenever the route changes so tapping a nav item both
  // navigates and hides the overlay.
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  const handleLogout = () => {
    logout();
    navigate(APP_ROUTES.login, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar
        onOpenSidebar={openSidebar}
        name={session?.user.name ?? '—'}
        role={session?.user.role ?? ''}
        onLogout={handleLogout}
      />

      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/50"
        />
      )}

      {/* Sidebar drawer (same behavior at every breakpoint) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-card transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarHeader onClose={closeSidebar} />

        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={closeSidebar} />
        </div>

        <SidebarFooter
          name={session?.user.name ?? '—'}
          role={session?.user.role ?? ''}
          onLogout={handleLogout}
        />
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function Topbar({
  onOpenSidebar,
  name,
  role,
  onLogout,
}: {
  onOpenSidebar: () => void;
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
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
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
  const ref = useRef<HTMLDivElement>(null);

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
    </div>
  );
}

function SidebarHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-border px-5">
      <img
        src="/logo.png"
        alt="MajbetNow"
        className="size-11 shrink-0 object-contain"
      />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-black leading-tight tracking-tight">
          MajbetNow
        </div>
        <div className="text-xs text-muted-foreground leading-tight">
          Panel de administración
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Cerrar menú"
        title="Cerrar menú"
      >
        <X className="size-4" />
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
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">
            {role}
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </div>
  );
}
