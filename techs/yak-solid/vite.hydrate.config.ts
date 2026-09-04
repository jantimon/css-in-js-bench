// Hydrate (browser) build for @yak/solid — same yak plugin as the microbench build (so
// the client's compiled classes match the SSR markup it hydrates), with
// solid({ ssr: true }) so the JSX compiles to HYDRATABLE client code that claims the
// server's DOM instead of rebuilding it. No CSS emission needed: the client only
// re-attaches to the SSR DOM; hydration cares about structure, not styles.
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { yak } from "@yak/solid/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");

export default defineConfig(async () => ({
  root: here,
  plugins: [await yak({ basePath: REPO_ROOT }), solid({ ssr: true })],
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
}));
