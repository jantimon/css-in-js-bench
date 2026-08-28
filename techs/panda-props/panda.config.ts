import { defineConfig } from "@pandacss/dev";

// Panda config for this lane — self-contained (§13). Scans THIS lane's own case
// files and emits styled-system + the atomic sheet INTO this folder, so the build
// needs nothing from outside. `panda css()` returns atomic class names at runtime
// (the cost the bench measures); `panda cssgen` extracts the rules from the same files.
export default defineConfig({
  preflight: false, // apples-to-apples with Tailwind (preflight also off there)
  include: ["./case/**/*.{ts,tsx}"],
  exclude: [],
  theme: { extend: {} },
  // Panda 2.x no longer ships the v1 preset-base conditions built in; restore
  // the ones these cases use with the exact v1 selectors so the sheet stays unchanged.
  conditions: {
    extend: {
      before: "&::before",
      after: "&::after",
      hover: "&:is(:hover, [data-hover])",
      disabled: "&:is(:disabled, [disabled], [data-disabled])",
      focusVisible: "&:is(:focus-visible, [data-focus-visible])",
    },
  },
  jsxFramework: "react",
  outdir: "styled-system",
});
