import { defineConfig } from "@pandacss/dev";

// Panda config for this lane — self-contained (§13). Scans THIS lane's own case
// files and emits styled-system + the atomic sheet INTO this folder, so the build
// needs nothing from outside. `panda css()` returns atomic class names at runtime
// (the cost the bench measures); `panda cssgen` extracts the rules from the same files.
export default defineConfig({
  preflight: false, // apples-to-apples with Tailwind (preflight also off there)
  include: ["./case/**/*.tsx"],
  exclude: [],
  theme: { extend: {} },
  jsxFramework: "react",
  outdir: "styled-system",
});
