import type { CaseMeta } from "../report/types";

// A 3-level component composition: a Button wrapped by a wrapper wrapped by another,
// each adding classes and forwarding className down. The harness renders one 3-level
// chain per instance. next-yak flattens the whole chain to one wrapper at build time,
// so depth is almost free; the Tailwind lanes run one merge per level.
export default {
  label: "Composed components (3 levels)",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "A Button wrapped by two more components, each adding styles and threading className down. next-yak " +
    "flattens the chain at build time (depth ≈ free); the Tailwind lanes pay one merge per level and " +
    "styled-components/Emotion run a wrapper component at each.",
} satisfies CaseMeta;
