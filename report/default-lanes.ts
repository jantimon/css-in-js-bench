// The lanes a reader sees on a clean URL (the controller's isDefaultLane in report.tsx: React
// lanes minus the diagnostic ones). The page is rendered in that state, so bars, scales and
// "best" values match before the script runs and nothing jumps on load.
let on: Set<string> | null = null;

export function setDefaultLanes(lanes: Set<string>): void {
  on = lanes;
}

export function isDefaultOn(tech: string): boolean {
  return !on || on.has(tech);
}

/** Items shown by default; all of them when none is (so a chart never scales to nothing). */
export function defaultShown<T extends { tech: string }>(items: T[]): T[] {
  const shown = items.filter((i) => isDefaultOn(i.tech));
  return shown.length ? shown : items;
}
