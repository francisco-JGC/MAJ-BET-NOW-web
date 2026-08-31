/**
 * Generates a memorable-ish random password: 10 chars mixing lowercase,
 * uppercase and digits, with at least one of each so it always satisfies
 * common validators.
 */
export function generatePassword(length = 10): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz';   // excludes l, o for readability
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // excludes I, O
  const digits = '23456789';                  // excludes 0, 1
  const all = lower + upper + digits;

  const pick = (pool: string) =>
    pool[Math.floor(Math.random() * pool.length)];

  const chars: string[] = [pick(lower), pick(upper), pick(digits)];
  for (let i = chars.length; i < length; i++) chars.push(pick(all));

  // Fisher–Yates shuffle so the guaranteed picks aren't always at the start.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
