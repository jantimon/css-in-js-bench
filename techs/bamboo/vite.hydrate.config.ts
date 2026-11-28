// Hydrate (browser) build for the Bamboo lane — the same compiler plugin as the
// microbench build (so the client's compiled class strings match the SSR markup),
// browser target over client-entry.tsx. This is the build a Bamboo app ships, so it runs
// no Bamboo CLI: the plugin writes ./styled-system in its own buildStart and emits the
// stylesheet through virtual:bamboo.css. bamboo.css is read only by ssr-entry.tsx's
// sheet slice, so the microbench build writes it.
import { browserStyles } from "../../scripts/browser-styles.ts";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import bamboocss from "@bamboocss/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [browserStyles(here, "native"), bamboocss({ cwd: here }), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  resolve: { alias: { "styled-system": resolve(here, "styled-system") } },
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
