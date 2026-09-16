Panda extracts styles at build time: a style prop resolves to a name for the declaration the extractor can read from the source and emits nothing for a value composed at render. A `transform` prop built from the instance index yields a class with no rule behind it, so the naive path this case measures cannot be written with the primitive.

A Panda maintainer, asked about this cell:

> Panda is build time and css() is mostly a name resolver; it doesn't generate a rule. Using translateX(${i}px) is pretty far outside what Panda's for.

Source: Adebesin Tolulope, Panda maintainer, in a direct message to the bench author, August 2026. The docs say the same: "We recommend that you avoid relying on runtime values for your styles. Consider using recipes, css variables or `data-*` attributes instead" ([Dynamic styling](https://panda-css.com/docs/guides/dynamic-styling)). The inline-style path is what `dyn-fair` measures, and this lane takes part there.
