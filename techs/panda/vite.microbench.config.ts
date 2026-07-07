// Standalone microbench build for Panda (css fn) (§4.2). All build knowledge lives
// here: a buildStart hook runs `panda codegen` (→ ./styled-system) and `panda cssgen`
// (→ ./panda.css) over THIS lane's own case files, so the folder is self-contained and
// extraction is a folder move (§13). css() returns atomic class names at runtime (the
// cost measured); the sheet is sliced per-render in ssr-entry.tsx.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pandaBin = join(dirname(require.resolve("@pandacss/dev/package.json")), "bin.js");

// Generate styled-system + panda.css from this lane's case files before the bundle.
const pandaCodegen = (): Plugin => ({
  name: "panda-codegen",
  buildStart() {
    const run = (args: string[]) => execFileSync("node", [pandaBin, ...args], { cwd: here, stdio: "ignore" });
    run(["codegen", "--config", "./panda.config.ts"]);
    run(["cssgen", "--config", "./panda.config.ts", "--outfile", "./panda.css"]);
  },
});

export default defineConfig({
  root: here,
  plugins: [pandaCodegen(), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  resolve: { alias: { "styled-system": resolve(here, "styled-system") } },
  build: {
    outDir: "dist/microbench",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    ssr: true,
    target: "node20",
    rollupOptions: {
      input: "./ssr-entry.tsx",
      external: [],
      preserveEntrySignatures: "strict",
      output: { format: "es", entryFileNames: "entry.mjs" },
    },
  },
  ssr: { noExternal: true },
});
