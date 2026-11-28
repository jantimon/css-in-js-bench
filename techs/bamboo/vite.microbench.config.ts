// Standalone microbench build for Bamboo (§4.2). All build knowledge lives here: the
// @bamboocss/vite plugin writes ./styled-system in its own buildStart and replaces every
// css() call with its class-string literal — there is no runtime styling path, which is
// exactly the cost profile the bench measures. A buildStart hook runs `bamboo cssgen`
// (→ ./bamboo.css) over THIS lane's own case files, so the folder is self-contained and
// extraction is a folder move (§13). ssr-entry.tsx slices that sheet per render; it is
// minified, as a production stylesheet ships.
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

// Write the sheet ssr-entry.tsx slices, from this lane's case files, before the bundle.
const bambooCssgen = (): Plugin => ({
  name: "bamboo-cssgen",
  buildStart() {
    execFileSync("node", [bambooBin, "cssgen", "--config", "./bamboo.config.ts", "--minify", "--outfile", "./bamboo.css"], { cwd: here, stdio: "ignore" });
  },
});

export default defineConfig({
  root: here,
  plugins: [bambooCssgen(), bamboocss({ cwd: here }), react()],
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
