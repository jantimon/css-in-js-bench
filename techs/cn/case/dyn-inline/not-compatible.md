`dyn-inline` is the control for `dyn-fair`: every lane in it uses a static class plus a plain inline style for the unique `translateX`, including next-yak, which drops its CSS-variable indirection here. Only the vanilla floors and the next-yak lanes take part, so the delta between the two cases isolates what the CSS-variable path itself costs.

A cell for this lane would add nothing to that comparison; its inline-style number is already in `dyn-fair`. Not a compatibility gap, a control. Source: [the case definition](https://github.com/jantimon/css-in-js-bench/blob/main/cases/dyn-inline.ts).
