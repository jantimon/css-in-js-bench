// Report-owned reduction of RAW samples → a single statistic (§10.3). Because gen
// persists raw arrays, the chosen statistic can change here without re-running any
// benchmark.

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function bestOf(xs: number[]): number {
  return xs.length ? Math.max(...xs) : 0;
}

/** p in [0,1]; nearest-rank on the sorted samples. */
export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

/** Relative spread (half the IQR over the median), as a fraction — for ± copy. */
export function spread(xs: number[]): number {
  if (xs.length < 4) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const med = median(s);
  return med ? (q(0.75) - q(0.25)) / 2 / med : 0;
}

// Visual grouping: two adjacent (already-sorted) bars belong to the same cluster when they
// differ by < this fraction. 4% sits in the natural valley across every measurement
// (same-tier/noise steps ≤~3%, real tier jumps ≥~4.5%).
export const GROUP_GAP = 0.04;

/**
 * For a sorted value list, mark each index that should get a separating gap before it.
 * A gap is only drawn at a tier boundary that BORDERS A CLUSTER (a run of ≥2 near-tied
 * bars) — so a chart where every bar is already distinct (all singletons) gets NO gaps,
 * and the gaps that remain genuinely set clusters apart from the rest.
 */
export function groupBreaks(sortedValues: number[]): boolean[] {
  const n = sortedValues.length;
  const out = new Array(n).fill(false);
  // group start indices: index 0, plus every index that jumps a tier from its predecessor.
  const starts: number[] = [];
  for (let i = 0; i < n; i++) {
    const lo = i > 0 ? Math.min(sortedValues[i], sortedValues[i - 1]) : 0;
    if (i === 0 || (lo > 0 && Math.abs(sortedValues[i] - sortedValues[i - 1]) / lo >= GROUP_GAP)) starts.push(i);
  }
  starts.push(n); // sentinel so group g spans [starts[g], starts[g+1])
  for (let g = 1; g < starts.length - 1; g++) {
    const prevSize = starts[g] - starts[g - 1];
    const curSize = starts[g + 1] - starts[g];
    if (prevSize >= 2 || curSize >= 2) out[starts[g]] = true; // boundary touches a cluster
  }
  return out;
}
