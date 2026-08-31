import { Loader2 } from 'lucide-react';

/**
 * Floating "Actualizando…" pill shown over a table while a refetch is in
 * flight. Pair with `className={cn('...', show && 'opacity-50')}` on the
 * `<table>` and a `relative` container so the overlay positions correctly.
 * Skip on the first load — use skeleton rows instead so the user sees the
 * table shape immediately.
 */
export function TableLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        Actualizando…
      </div>
    </div>
  );
}
