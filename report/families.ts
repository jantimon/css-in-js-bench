// Editorial grouping + short labels for the technology legend (PRESENTATION only — the
// report owns this, like priority.ts). This does NOT decide which lanes exist (that's the
// filesystem); it only groups + relabels the ones that do. A lane present in the data but
// absent here falls into an "Other" group with its package.json description as the label,
// so adding a tech folder never requires editing this file — it just renders ungrouped.
//
// A group is one STYLING technique. The render engine is a second, independent axis, so it
// splits each group into rows instead of forming groups of its own — that keeps a library's
// React and Solid lanes side by side, which is the comparison the report is for.
export interface Family {
  group: string;
  /** The bare-framework lanes. They sit out the engine filter, which selects styling techniques. */
  floor?: boolean;
  items: { tech: string; short: string }[];
}

export interface FamilyRow {
  /** Engine id, from bench.framework. */
  engine: string;
  label: string;
  items: { tech: string; short: string }[];
}

export interface GroupedFamily {
  group: string;
  floor?: boolean;
  rows: FamilyRow[];
}

export const FAMILIES: Family[] = [
  {
    group: "Baseline",
    floor: true,
    items: [
      { tech: "vanilla", short: "vanilla" },
      { tech: "vanilla-solid", short: "vanilla" },
    ],
  },
  {
    group: "next-yak",
    items: [
      { tech: "next-yak", short: "styled" },
      { tech: "next-yak-nofold", short: "styled, no fold" },
      { tech: "next-yak-css", short: "css-prop" },
      { tech: "next-yak-css-nofold", short: "css-prop, no fold" },
      { tech: "yak-solid", short: "styled" },
      { tech: "yak-solid-nofold", short: "styled, no fold" },
    ],
  },
  {
    group: "Panda",
    items: [
      { tech: "panda", short: "css fn" },
      { tech: "panda-props", short: "style props" },
      { tech: "panda-recipe", short: "recipe" },
      { tech: "bamboo", short: "Bamboo" },
    ],
  },
  {
    group: "Tailwind",
    items: [
      { tech: "cn", short: "cn" },
      { tech: "cnfast", short: "cnfast" },
      { tech: "tailwind-merge", short: "tailwind-merge" },
      { tech: "cn-solid", short: "cn" },
    ],
  },
  {
    group: "StyleX",
    items: [
      { tech: "stylex-layers", short: "layers" },
      { tech: "stylex", short: ":not hack" },
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
];

const ENGINE_ORDER = ["react", "solid"];
const ENGINE_LABEL: Record<string, string> = { react: "React", solid: "Solid" };

/** One labelled row per render engine — always labelled, so the engine reads the same in a
 *  group that holds one as in a group that holds both, and every row can act as its filter. */
function engineRows(items: Family["items"], engineOf: (tech: string) => string): FamilyRow[] {
  const byEngine = new Map<string, Family["items"]>();
  for (const item of items) {
    const engine = engineOf(item.tech);
    (byEngine.get(engine) ?? byEngine.set(engine, []).get(engine)!).push(item);
  }
  return [...byEngine.entries()]
    .sort((a, b) => ENGINE_ORDER.indexOf(a[0]) - ENGINE_ORDER.indexOf(b[0]))
    .map(([engine, rowItems]) => ({ engine, label: ENGINE_LABEL[engine] ?? engine, items: rowItems }));
}

/** Group the lanes that actually have data, in editorial order; unknown lanes → "Other". */
export function groupTechs(usedTechs: string[], engineOf: (tech: string) => string): GroupedFamily[] {
  const placed = new Set<string>();
  const out: GroupedFamily[] = [];
  for (const fam of FAMILIES) {
    const items = fam.items.filter((it) => usedTechs.includes(it.tech));
    items.forEach((it) => placed.add(it.tech));
    if (items.length) out.push({ group: fam.group, floor: fam.floor, rows: engineRows(items, engineOf) });
  }
  const rest = usedTechs.filter((t) => !placed.has(t));
  if (rest.length) out.push({ group: "Other", rows: engineRows(rest.map((t) => ({ tech: t, short: t })), engineOf) });
  return out;
}
