import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/shared/lib/cn';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  /** Optional slot rendered before the label in both trigger + option row. */
  leading?: React.ReactNode;
  /** Optional tiny caption under the label in the option row. */
  hint?: string;
  disabled?: boolean;
}

interface Props<V extends string> {
  value: V | '';
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  placeholder?: string;
  disabled?: boolean;
  /** Optional icon inside the trigger, before the label. */
  leadingIcon?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Fully custom dropdown that mirrors our input aesthetic (border-border,
 * rounded-lg, focus ring primary/20). The floating menu is styled from
 * scratch — no reliance on the OS's native `<select>` popup.
 *
 * Trade-off: no built-in mobile-native picker. If we ever need that on
 * touch, we can conditionally swap in a `<select>` for small breakpoints.
 */
export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción',
  disabled,
  leadingIcon,
  ariaLabel,
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  // Click outside / Escape → close.
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
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Sync the highlighted row with the current value each time the menu opens.
  useEffect(() => {
    if (open) {
      const idx = selected
        ? options.findIndex((o) => o.value === selected.value)
        : -1;
      setActiveIndex(idx);
    }
  }, [open, options, selected]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => nextEnabled(options, i, +1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => nextEnabled(options, i, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        setOpen(false);
        onChange(opt.value);
      }
    }
  };

  const pickOption = (opt: SelectOption<V>) => {
    if (opt.disabled) return;
    setOpen(false);
    onChange(opt.value);
  };

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
        onKeyDown={handleKeyDown}
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
        {selected ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {selected.leading && (
              <span className="shrink-0">{selected.leading}</span>
            )}
            <span className="truncate font-medium text-foreground">
              {selected.label}
            </span>
          </span>
        ) : (
          <span className="flex-1 truncate text-muted-foreground/70">
            {placeholder}
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
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {options.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-muted-foreground/70">
                Sin opciones
              </li>
            )}
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <li key={opt.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onMouseEnter={() => setActiveIndex(idx)}
                    // Selección en `click`, no en `pointerdown`. `pointerdown`
                    // dispara apenas el dedo toca la pantalla en mobile — un
                    // intento de scroll (drag) seleccionaba la opción donde
                    // el usuario apoyó el dedo antes de que arrancara a
                    // arrastrar. `click` solo dispara si el pointer levanta
                    // cerca del punto inicial: un scroll NO lo dispara, un
                    // tap sí. En desktop el comportamiento es idéntico.
                    onClick={(e) => {
                      if (opt.disabled) return;
                      e.stopPropagation();
                      pickOption(opt);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition',
                      opt.disabled
                        ? 'cursor-not-allowed opacity-50'
                        : isActive
                          ? 'bg-primary/10 text-foreground'
                          : 'hover:bg-secondary',
                      isSelected && 'font-semibold',
                    )}
                  >
                    {opt.leading && (
                      <span className="shrink-0">{opt.leading}</span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="truncate text-xs text-muted-foreground">
                          {opt.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check
                        className="size-4 shrink-0 text-primary"
                        strokeWidth={2.6}
                      />
                    )}
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

function nextEnabled<V extends string>(
  options: readonly SelectOption<V>[],
  current: number,
  dir: 1 | -1,
): number {
  if (options.length === 0) return -1;
  let idx = current;
  for (let i = 0; i < options.length; i++) {
    idx = (idx + dir + options.length) % options.length;
    if (!options[idx].disabled) return idx;
  }
  return current;
}
