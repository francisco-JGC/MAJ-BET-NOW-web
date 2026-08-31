const CURRENCY_FMT = new Intl.NumberFormat('es-NI', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats amounts as "C$1,234". */
export function formatCurrency(value: number): string {
  return `C$${CURRENCY_FMT.format(value)}`;
}

const COMPACT_FMT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Compact number for chart axes: 1250 → "1.3K". */
export function formatCompact(value: number): string {
  return COMPACT_FMT.format(value);
}
