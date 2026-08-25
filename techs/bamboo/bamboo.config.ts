import { defineConfig } from "@bamboocss/dev";

// Bamboo config for this lane — self-contained (§13). Scans THIS lane's own case
// files and emits styled-system + the atomic sheet INTO this folder, so the build
// needs nothing from outside. Unlike Panda, `css()` never runs at runtime here:
// the @bamboocss/vite compiler replaces every call with its class-string literal
// at build time; `bamboo cssgen` extracts the same rules from the same files.
export default defineConfig({
  preflight: false, // apples-to-apples with Tailwind (preflight also off there)
  include: ["./case/**/*.{ts,tsx}"],
  exclude: [],
  theme: { extend: {} },
  // Match the Panda lane's conditions so the two atomic compilers emit the same
  // selectors for the pseudo props these cases use.
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
