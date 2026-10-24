// Hydrate (browser) build for the Zyzz lane: the same zyzz plugin as the microbench build
// (so the client's classes match the SSR markup), browser target over client-entry.tsx.
// The zyzz CSS is a module-graph import, so the manifest links it to the browser page.
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { zyzz } from "zyzz/vite";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "native"), zyzz(), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist/hydrate",
    manifest: true,
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    target: "chrome120",
    rollupOptions: {
      input: "./client-entry.tsx",
      external: [],
      output: { format: "es", entryFileNames: "entry.js" },
    },
  },
});
