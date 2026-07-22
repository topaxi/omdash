/**
 * The number of derived data points kept for each metric's sparkline series.
 * Consumers only ever render a suffix of ~60 points (see `cpu.ts`/`gpu.ts`
 * `slice(-60)`), so there is no reason to retain more.
 */
export const SERIES_LIMIT = 60;

/**
 * Append `value` to a numeric series, keeping at most `limit` most-recent
 * points. Returns a new array (kept immutable for Redux) sized to `limit`.
 */
export function pushCapped(
  series: readonly number[],
  value: number,
  limit: number = SERIES_LIMIT,
): number[] {
  if (series.length < limit) {
    return [...series, value];
  }

  // Drop the oldest point(s) so the result is exactly `limit` long.
  return [...series.slice(series.length - limit + 1), value];
}
