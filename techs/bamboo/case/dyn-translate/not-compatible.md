Bamboo resolves every `css()` object at build time to a class-string literal and rejects a value that exists only at render. The naive path this case measures, a `translateX` computed from the instance index inside `css()`, fails the build with `css() — dynamic`.

The library's author states the position and the intended path:

> Bamboo intentionally does not handle dynamic styles and in rare cases where it has to be a runtime value delegates to `style=` or `data-` attributes.

Source: [gajus, Bamboo's author, in issue #7](https://github.com/jantimon/css-in-js-bench/issues/7#issuecomment-5381517407). That `style=` path is what `dyn-fair` measures, and this lane takes part there.
