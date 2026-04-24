export interface PrepTimeSummary {
  readonly count: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly avg: number | null;
  readonly min: number | null;
  readonly max: number | null;
}

export function percentile(
  values: readonly number[],
  q: number,
): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  const sorted = [...values].sort((a, b) => a - b);
  const rank = q * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

export function summarizePrepTimes(
  prepSeconds: readonly number[],
): PrepTimeSummary {
  const clean = prepSeconds.filter((v) => Number.isFinite(v) && v >= 0);

  if (clean.length === 0) {
    return { count: 0, p50: null, p95: null, avg: null, min: null, max: null };
  }

  const sum = clean.reduce((acc, v) => acc + v, 0);
  return {
    count: clean.length,
    p50: percentile(clean, 0.5),
    p95: percentile(clean, 0.95),
    avg: Math.round((sum / clean.length) * 100) / 100,
    min: Math.min(...clean),
    max: Math.max(...clean),
  };
}
