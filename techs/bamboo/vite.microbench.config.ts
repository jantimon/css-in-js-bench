// Standalone microbench build for Bamboo (§4.2). All build knowledge lives here:
// a buildStart hook runs `bamboo codegen` (→ ./styled-system) and `bamboo cssgen`
// (→ ./bamboo.css) over THIS lane's own case files, so the folder is self-contained
// and extraction is a folder move (§13). The @bamboocss/vite compiler then replaces
// every css() call with its class-string literal — there is no runtime styling path,
// which is exactly the cost profile the bench measures. The sheet is sliced
// per-render in ssr-entry.tsx.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import bamboocss from "@bamboocss/vite";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bambooBin = join(dirname(require.resolve("@bamboocss/dev/package.json")), "bin.js");

// Generate styled-system + bamboo.css from this lane's case files before the bundle.
const bambooCodegen = (): Plugin => ({
  name: "bamboo-codegen",
  buildStart() {
    const run = (args: string[]) => execFileSync("node", [bambooBin, ...args], { cwd: here, stdio: "ignore" });
    run(["codegen", "--config", "./bamboo.config.ts"]);
    run(["cssgen", "--config", "./bamboo.config.ts", "--outfile", "./bamboo.css"]);
  },
});

export default defineConfig({
  root: here,
  plugins: [bambooCodegen(), bamboocss({ cwd: here }), react()],
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
