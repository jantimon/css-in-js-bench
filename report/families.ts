// Editorial grouping + short labels for the technology legend (PRESENTATION only — the
// report owns this, like priority.ts). This does NOT decide which lanes exist (that's the
// filesystem); it only groups + relabels the ones that do. A lane present in the data but
// absent here falls into an "Other" group with its package.json description as the label,
// so adding a tech folder never requires editing this file — it just renders ungrouped.
export interface Family {
  group: string;
  items: { tech: string; short: string }[];
}

export const FAMILIES: Family[] = [
  { group: "Baseline", items: [{ tech: "vanilla", short: "vanilla" }] },
  {
    group: "next-yak",
    items: [
      { tech: "next-yak", short: "core" },
      { tech: "next-yak-css", short: "css prop" },
      { tech: "next-yak-released", short: "released" },
    ],
  },
  {
    group: "Panda",
    items: [
      { tech: "panda", short: "css fn" },
      { tech: "panda-props", short: "style props" },
      { tech: "panda-recipe", short: "recipe" },
    ],
  },
  {
    group: "Runtime CSS-in-JS",
    items: [
      { tech: "emotion", short: "Emotion" },
      { tech: "goober", short: "Goober" },
      { tech: "styled-components", short: "styled-components" },
    ],
  },
  {
    group: "Atomic / className",
    items: [
      { tech: "stylex", short: "StyleX" },
      { tech: "cnfast", short: "cnfast" },
      { tech: "tailwind-merge", short: "tailwind-merge" },
    ],
  },
];

/** Group the lanes that actually have data, in editorial order; unknown lanes → "Other". */
export function groupTechs(usedTechs: string[]): Family[] {
  const placed = new Set<string>();
  const out: Family[] = [];
  for (const fam of FAMILIES) {
    const items = fam.items.filter((it) => usedTechs.includes(it.tech));
    items.forEach((it) => placed.add(it.tech));
    if (items.length) out.push({ group: fam.group, items });
  }
  const rest = usedTechs.filter((t) => !placed.has(t));
  if (rest.length) out.push({ group: "Other", items: rest.map((t) => ({ tech: t, short: t })) });
  return out;
}
