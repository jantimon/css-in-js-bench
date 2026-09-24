// Standalone microbench build for Plumeria on Solid (§4.2), the Solid twin of the
// `plumeria` lane, so the pair isolates what the FRAMEWORK costs a build-time atomic
// library. The Plumeria unplugin compiles every css.create({…}) to build-time atomic CSS
// and rewrites the `classStyle` JSX prop to a literal class attribute, so nothing of the
// library survives into the SSR bundle. Its transform hook declares order:'pre', so it
// still sees the JSX whichever side of solid() it sits on; solid({ ssr: true }) then
// compiles the tree to Solid's string-concatenation SSR renderer. The emitted
// stylesheet is consolidated
// (cssCodeSplit:false) so ssr-entry.tsx can read it back as the `css` half of the
// { html, css } contract.
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import plumeria from "@plumeria/unplugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [plumeria.vite(), solid({ ssr: true })],
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
