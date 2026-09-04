// Standalone microbench build for @yak/solid (§4.2). The yak SWC plugin extracts every
// styled`…` to build-time CSS and consolidates it into a sibling stylesheet asset
// (cssCodeSplit:false), so ssr-entry.tsx can read it back as the `css` half of the
// { html, css } contract. solid({ ssr: true }) compiles the JSX to Solid's string-
// concatenation SSR renderer instead of the DOM one.
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
  plugins: [await yak({ basePath: REPO_ROOT }), solid({ ssr: true })],
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
