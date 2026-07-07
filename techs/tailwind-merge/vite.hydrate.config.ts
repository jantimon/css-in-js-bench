// Standalone hydrate build for the vanilla lane (§4.2). A BROWSER build of
// client-entry.tsx → dist/hydrate/entry.js (react/react-dom bundled IN, minified), the
// client bundle that hydrates the SSR markup. Other techs copy this and swap `plugins`
// (yak SWC, StyleX, …) exactly like vite.microbench.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
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
