// Standalone microbench build for next-yak (css prop) (§4.2). viteYak runs the SWC
// plugin that extracts every css`…` to build-time CSS; the emitted stylesheet is
// consolidated (cssCodeSplit:false) so ssr-entry.tsx can read it back as the `css`
// half of the { html, css } contract.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteYak } from "next-yak/vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../..");

export default defineConfig(async () => ({
  root: here,
  plugins: [await viteYak({ basePath: REPO_ROOT, foldStatic: false }), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  // next-yak comes from the local source (link:), which brings its OWN react — dedupe
  // to a single copy so next-yak's hooks and react-dom share one dispatcher.
  resolve: { dedupe: ["react", "react-dom"] },
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
