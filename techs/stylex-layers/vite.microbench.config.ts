// Standalone microbench build for StyleX (§4.2). The StyleX unplugin compiles
// every stylex.create({…}) to build-time atomic CSS; the emitted stylesheet is
// consolidated (cssCodeSplit:false) so ssr-entry.tsx can read it back as the `css`
// half of the { html, css } contract. STYLEX_CFG is the shared compiler config so
// the atomic class hashes match everywhere.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vite as stylexVite } from "@stylexjs/unplugin";
import { STYLEX_CFG } from "./stylex.config.mjs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => ({
  root: here,
  plugins: [stylexVite(STYLEX_CFG), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    outDir: "dist/microbench",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    cssCodeSplit: false,
    ssr: true,
    ssrEmitAssets: true, // SSR builds skip CSS assets by default — keep the stylex sheet
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
