import { useEffect } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max width of the panel (Tailwind class). Defaults to `max-w-2xl`. */
  size?: string;
}

/**
 * Centered dialog with backdrop. Closes on Escape or backdrop click.
 * Locks body scroll while open so background lists don't jump.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'max-w-2xl',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]"
      />
      {/*
        Panel SIN `overflow-hidden`: los dropdowns/tooltips que hijos
        posicionan `absolute` (ej. el <Select> custom) deben poder
        salirse de los límites del panel; si lo clipamos, la lista se
        recorta a la altura visible del modal. Como contrapartida:
          - header hereda `bg-card` del panel, no necesita redondeo.
          - footer tiene bg propio, por eso agregamos `rounded-b-2xl`
            para que sus esquinas inferiores coincidan con las del panel.
      */}
      <div
        className={cn(
          'relative z-10 mt-6 w-full rounded-2xl bg-card shadow-[0_24px_64px_-24px_rgba(15,23,42,0.35)] ring-1 ring-black/5',
          size,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="text-lg font-black tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-border bg-slate-50/60 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
