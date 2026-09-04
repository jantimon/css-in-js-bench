// Standalone microbench build for the vanilla-solid lane (§4.2). SSR-bundles
// ssr-entry.tsx into ONE self-contained dist/microbench/entry.mjs (solid-js and
// @solidjs/web bundled IN), so gen can import it and call renderCase() with no external
// resolution. No styling plugin — just Solid's JSX compiler in SSR mode. This lane is
// the framework floor the yak-solid lane is measured against, the way vanilla is for
// the React lanes.
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [solid({ ssr: true })],
  define: { "process.env.NODE_ENV": '"production"' },
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
