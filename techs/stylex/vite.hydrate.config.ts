// Hydrate (browser) build for the StyleX lane — same stylex plugin + STYLEX_CFG as the
// microbench build (so the client's atomic classes match the SSR markup), browser target
// over client-entry.tsx. The manifest links the extracted stylesheet to the browser page.
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vite as stylexVite } from "@stylexjs/unplugin";
import { STYLEX_CFG } from "./stylex.config.mjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "stylex"), stylexVite(STYLEX_CFG), react()],
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
