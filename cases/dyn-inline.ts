import type { CaseMeta } from "../report/types";

// The value in the dynamic cases is one no build step can know: a position from a
// database record, or from a user interaction such as drag and drop. Every lane can
// write it as a plain inline style over a static class; that is not what this case
// tests. It is the control for dyn-fair: next-yak's own path turns the value into a
// CSS variable, and this case has the next-yak lanes write the plain inline style
// instead, over the same static class. Comparing the two cases shows whether the
// CSS-variable path costs anything over the inline style. Only the next-yak lanes and
// the framework floors take part; the other lanes are absent by design, not by limit,
// since their inline-style number is already in dyn-fair.
export default {
  label: "Dynamic value — translateX (inline-style control)",
  group: "2-dynamic",
  n: 1000,
  cardinality: "high",
  description:
    "A control for dyn-fair. The translateX is a value no build step can know, such as a position from a " +
    "database record or from a drag-and-drop interaction. Every lane can write it as a plain inline style " +
    "over a static class; here the next-yak lanes do exactly that, instead of their own CSS-variable path, " +
    "next to the bare framework floors. Compared with dyn-fair this shows whether next-yak's CSS-variable " +
    "path costs anything over the plain inline style. The other lanes are absent by design: their " +
    "inline-style number is already in dyn-fair.",
} satisfies CaseMeta;
