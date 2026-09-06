// Hydrate (browser) build for @yak/solid — same yak plugin as the microbench build (so
// the client's compiled classes match the SSR markup it hydrates), with
// solid({ ssr: true }) so the JSX compiles to HYDRATABLE client code that claims the
// server's DOM. The manifest lists its browser script and extracted stylesheet.
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { yak } from "@yak/solid/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");

export default defineConfig(async () => ({
  root: here,
  plugins: [browserStyles(here, "native"), await yak({ basePath: REPO_ROOT }), solid({ ssr: true })],
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
}));
