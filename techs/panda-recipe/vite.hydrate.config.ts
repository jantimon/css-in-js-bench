// Hydrate (browser) build for the Panda lanes — same panda codegen buildStart +
// styled-system alias as the microbench build (so the client's atomic classes match the
// SSR markup), browser target over client-entry.tsx.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pandaBin = join(dirname(require.resolve("@pandacss/dev/package.json")), "bin.js");

const pandaCodegen = (): Plugin => ({
  name: "panda-codegen",
  buildStart() {
    const run = (args: string[]) => execFileSync("node", [pandaBin, ...args], { cwd: here, stdio: "ignore" });
    run(["codegen", "--config", "./panda.config.ts"]);
    run(["cssgen", "--config", "./panda.config.ts", "--outfile", "./panda.css"]);
  },
});

export default defineConfig({
  root: here,
  plugins: [pandaCodegen(), react()],
  define: { "process.env.NODE_ENV": '"production"' },
  resolve: { alias: { "styled-system": resolve(here, "styled-system") } },
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
