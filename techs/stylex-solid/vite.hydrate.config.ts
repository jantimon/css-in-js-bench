// Hydrate (browser) build for StyleX on Solid — same stylex plugin + STYLEX_CFG as the
// microbench build (so the client's atomic classes match the SSR markup), with
// solid({ ssr: true }) so the JSX compiles to HYDRATABLE client code that claims the server's
// DOM. The manifest links the extracted stylesheet to the browser page.
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { vite as stylexVite } from "@stylexjs/unplugin";
import { STYLEX_CFG } from "./stylex.config.mjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "stylex"), stylexVite(STYLEX_CFG), solid({ ssr: true })],
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
