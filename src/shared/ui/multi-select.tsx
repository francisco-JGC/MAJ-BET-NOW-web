import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface MultiSelectOption<V extends string = string> {
  value: V;
  label: string;
}

interface Props<V extends string> {
  values: readonly V[];
  onChange: (values: V[]) => void;
  options: readonly MultiSelectOption<V>[];
  placeholder?: string;
  /** Etiqueta usada en el trigger cuando hay N seleccionados (N > umbral). */
  itemLabel?: string;
  /** Muestra "N {itemLabel}" cuando N excede este umbral. Si <=, se listan. */
  summaryThreshold?: number;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Dropdown de selección múltiple con checkboxes. Trigger muestra la lista de
 * seleccionados (o "N {itemLabel}" cuando pasa el `summaryThreshold`).
 * Comparte estética con `Select` (misma clase de botón, mismo popover).
 *
 * Comportamiento:
 *  - Sin selección → todos los items (por convención, quien consume interpreta
 *    `values: []` como "todos"). Se muestra el placeholder.
 *  - Click en item → toggle. La lista NO se cierra al seleccionar para
 *    permitir marcar varios seguidos.
 *  - "Todas" borra la selección (equivale a []).
 */
export function MultiSelect<V extends string>({
  values,
  onChange,
  options,
  placeholder = 'Seleccione…',
  itemLabel = 'items',
  summaryThreshold = 2,
  disabled,
  leadingIcon,
  ariaLabel,
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(values), [values]);
  const selectedLabels = useMemo(
    () =>
      options
        .filter((o) => selectedSet.has(o.value))
        .map((o) => o.label),
    [options, selectedSet],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: V) => {
    const next = selectedSet.has(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onChange(next);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const summary =
    values.length === 0
      ? null
      : values.length > summaryThreshold
        ? `${values.length} ${itemLabel}`
        : selectedLabels.join(', ');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-primary ring-2 ring-primary/20',
        )}
      >
        {leadingIcon && (
          <span className="flex shrink-0 items-center text-muted-foreground">
            {leadingIcon}
          </span>
        )}
        {summary ? (
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
            {summary}
          </span>
        ) : (
          <span className="flex-1 truncate text-muted-foreground/70">
            {placeholder}
          </span>
        )}
        {values.length > 0 && (
          <span
            role="button"
            tabIndex={-1}
            onClick={clear}
            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Limpiar selección"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </span>
        )}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180 text-primary',
          )}
          strokeWidth={2.4}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_-16px_rgba(15,23,42,0.24)]">
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-muted-foreground/70">
                Sin opciones
              </li>
            )}
            {options.map((opt) => {
              const isSelected = selectedSet.has(opt.value);
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(opt.value);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'bg-primary/5 font-semibold text-foreground'
                        : 'hover:bg-secondary',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border transition',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background',
                      )}
                    >
                      {isSelected && (
                        <Check
                          className="size-3 text-white"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
