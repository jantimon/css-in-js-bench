// Standalone microbench build for Plumeria (§4.2). The Plumeria unplugin compiles every
// css.create({…}) to build-time atomic CSS and rewrites the `classStyle` JSX prop into a
// literal `className`, so nothing of the library survives into the SSR bundle. The emitted
// stylesheet is consolidated (cssCodeSplit:false) so ssr-entry.tsx can read it back as the
// `css` half of the { html, css } contract.
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
    outDir: "dist/microbench",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
    ssr: true,
    ssrEmitAssets: true, // SSR builds skip CSS assets by default — keep the plumeria sheet
    target: "node20",
    rollupOptions: {
      input: "./ssr-entry.tsx",
      external: [],
      preserveEntrySignatures: "strict",
      output: { format: "es", entryFileNames: "entry.mjs", assetFileNames: "styles[extname]" },
    },
  },
  ssr: { noExternal: true },
});
