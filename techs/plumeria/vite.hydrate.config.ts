// Hydrate (browser) build for the Plumeria lane — same plumeria plugin as the microbench
// build (so the client's atomic classes match the SSR markup), browser target over
// client-entry.tsx. No CSS asset needed for hydration (structure-only re-attach).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import plumeria from "@plumeria/unplugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react(), plumeria.vite()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist/hydrate",
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
