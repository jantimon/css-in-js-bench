// Hydrate (browser) build for the vanilla-solid lane — the same client-entry every
// Solid lane ships, compiled hydratable (solid({ ssr: true })) so it claims the server's
// DOM instead of rebuilding it. Its gzipped size is the Solid framework floor that
// gen subtracts from the yak-solid lane's bundle.
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
