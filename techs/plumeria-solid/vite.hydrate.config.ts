// Hydrate (browser) build for Plumeria on Solid — same plumeria plugin as the microbench
// build (so the client's atomic classes match the SSR markup), with solid({ ssr: true })
// so the JSX compiles to HYDRATABLE client code that claims the server's DOM. The plugin
// emits the extracted stylesheet itself; the manifest links it to the browser page, and
// browser-styles.json tells the page there are no per-case sheets (the "native" kind).
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import plumeria from "@plumeria/unplugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "native"), plumeria.vite(), solid({ ssr: true })],
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
