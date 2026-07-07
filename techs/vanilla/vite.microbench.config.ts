// Standalone microbench build for the vanilla lane (§4.2). SSR-bundles ssr-entry.tsx
// into ONE self-contained dist/microbench/entry.mjs (react/react-dom bundled IN), so
// gen can import it and call renderCase() with no external resolution. vanilla needs
// no styling plugin — just the React JSX transform. Other techs copy this file and
// swap the `plugins` array (yak SWC, StyleX, Panda/Tailwind codegen, …).
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
    outDir: "dist/microbench",
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    ssr: true,
    target: "node20",
    rollupOptions: {
      input: "./ssr-entry.tsx",
      external: [],
      preserveEntrySignatures: "strict",
      output: { format: "es", entryFileNames: "entry.mjs" },
    },
  },
  ssr: { noExternal: true },
});
