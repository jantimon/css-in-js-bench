import type { CaseMeta } from "../report/types";

// A 3-level component composition: a Button wrapped by a wrapper wrapped by another,
// each adding classes and forwarding className down. The harness renders one 3-level
// chain per instance. @yak/react flattens the whole chain to one wrapper at build time,
// so depth is almost free; the Tailwind lanes run one merge per level.
export default {
  label: "Composition depth — 3 levels",
  group: "3-compose",
  n: 1000,
  cardinality: "low",
  description:
    "A button wrapped by two more components, each adding styles and passing className down. Some compilers flatten the chain at build time. Tailwind libraries merge classes once per level, and runtime libraries render an extra component per level.",
} satisfies CaseMeta;
