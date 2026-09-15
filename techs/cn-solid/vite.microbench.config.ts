// Standalone microbench build for the cn-solid lane (§4.2). SSR-bundles ssr-entry.tsx
// into ONE self-contained dist/microbench/entry.mjs (solid-js and @solidjs/web bundled
// IN), so gen can import it and call renderCase() with no external resolution. No
// styling plugin — cn merges class strings at runtime, so only Solid's JSX compiler in
// SSR mode is needed. Pairs with the React `cn` lane to isolate the framework cost.
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
