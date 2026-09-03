const MANAGUA_OFFSET = '-06:00';

/**
 * Returns an ISO timestamp for the start of the given date in Managua time.
 * E.g. "2026-09-02" → "2026-09-02T00:00:00-06:00"
 */
export function startOfDayParam(dateStr: string): string {
  return `${dateStr}T00:00:00${MANAGUA_OFFSET}`;
}

/**
 * Returns an ISO timestamp for the exclusive upper bound of the given date in
 * Managua time.  The backend uses `<` for the upper bound, so we send the
 * next day at midnight rather than 23:59:59, which would exclude the last
 * second of the day.
 * E.g. "2026-09-02" → "2026-09-03T00:00:00-06:00"
 */
export function endOfDayParam(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = next.toISOString().slice(0, 10);
  return `${nextStr}T00:00:00${MANAGUA_OFFSET}`;
}

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
