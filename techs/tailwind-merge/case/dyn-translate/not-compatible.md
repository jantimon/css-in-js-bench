Tailwind generates its CSS ahead of time by scanning source files for class names. From the docs: "Since Tailwind scans your source files as plain text, it has no way of understanding string concatenation or interpolation in the programming language you're using" ([Detecting classes in source files, Dynamic class names](https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names)).

The direct path this case measures builds `[transform:translateX(<i>px)]` from the instance index at render, so the scanner never sees the class and the element ships without its transform. `cn()` still parses the string on every render, but no rule ever exists behind it. Making it work takes a safelist of every value, or running Tailwind over the rendered output, which no production build does.

This lane's working path, a static utility plus an inline style for the value, is what `dyn-fair` measures, and this lane takes part there.
