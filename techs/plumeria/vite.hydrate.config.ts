// Hydrate (browser) build for the Plumeria lane — same plumeria plugin as the microbench
// build (so the client's atomic classes match the SSR markup), browser target over
// client-entry.tsx. The plugin emits the extracted stylesheet itself; the manifest links
// it to the browser page, and browser-styles.json tells the page there are no per-case
// sheets (the "native" kind, as for Bamboo).
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import plumeria from "@plumeria/unplugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "native"), react(), plumeria.vite()],
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
