// Hydrate (browser) build for the Bamboo lane — same bamboo codegen buildStart +
// compiler plugin as the microbench build (so the client's compiled class strings
// match the SSR markup), browser target over client-entry.tsx.
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import bamboocss from "@bamboocss/vite";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bambooBin = join(dirname(require.resolve("@bamboocss/dev/package.json")), "bin.js");

const bambooCodegen = (): Plugin => ({
  name: "bamboo-codegen",
  buildStart() {
    const run = (args: string[]) => execFileSync("node", [bambooBin, ...args], { cwd: here, stdio: "ignore" });
    run(["codegen", "--config", "./bamboo.config.ts"]);
    run(["cssgen", "--config", "./bamboo.config.ts", "--outfile", "./bamboo.css"]);
  },
});

export default defineConfig({
  root: here,
  plugins: [bambooCodegen(), bamboocss({ cwd: here }), react()],
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
