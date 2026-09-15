// Standalone microbench build for @yak/solid with folding off (§4.2). The yak SWC plugin
// extracts every styled`…` to build-time CSS and consolidates it into a sibling
// stylesheet asset (cssCodeSplit:false), so ssr-entry.tsx can read it back as the `css`
// half of the { html, css } contract. solid({ ssr: true }) compiles the JSX to Solid's
// string-concatenation SSR renderer instead of the DOM one.
// foldStatic: false keeps every styled component as a real component wrapper instead of
// rewriting the static ones into plain elements, so this lane measures @yak/solid's Solid
// runtime on its own — the same styled tree the compiler would otherwise erase.
// minify: true keeps the generated class names as short as the folded lane's, so the two
// differ only in the runtime wrapper, not in how many bytes each class name costs.
import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { yak } from "@yak/solid/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");

export default defineConfig(async () => ({
  root: here,
  // yak runs BEFORE solid so the SWC pass sees the original source, not compiled JSX.
  plugins: [await yak({ basePath: REPO_ROOT, foldStatic: false, minify: true }), solid({ ssr: true })],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist/microbench",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
    ssr: true,
    ssrEmitAssets: true, // SSR builds skip CSS assets by default — keep the yak sheet
    target: "node20",
    rollupOptions: {
      input: "./ssr-entry.tsx",
      external: [],
      preserveEntrySignatures: "strict",
      output: { format: "es", entryFileNames: "entry.mjs", assetFileNames: "styles[extname]" },
    },
  },
  ssr: { noExternal: true },
}));
