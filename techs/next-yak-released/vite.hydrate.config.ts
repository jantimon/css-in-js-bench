// Hydrate (browser) build for the next-yak lanes — same viteYak plugin as the
// microbench build (so the client's compiled css-prop classes match the SSR markup it
// hydrates), but a browser target over client-entry.tsx. No CSS emission needed: the
// client only re-attaches to the SSR DOM; hydration cares about structure, not styles.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteYak } from "next-yak/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");

export default defineConfig(async () => ({
  root: here,
  plugins: [await viteYak({ basePath: REPO_ROOT }), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  // next-yak (link:) brings its own react — dedupe to one copy (single dispatcher).
  resolve: { dedupe: ["react", "react-dom"] },
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
}));
