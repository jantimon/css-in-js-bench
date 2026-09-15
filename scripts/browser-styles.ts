import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import benchConfig from "../bench.config.ts";
import dynamicCase from "../cases/dyn-translate.ts";

// Browser utility classes cover both input states, including the last changed
// instance. A larger workload requires rebuilding this finite stylesheet.
export const utilityMaxInput = Math.max(dynamicCase.n, benchConfig.wpd.n, benchConfig.snapshotN);

type SheetKind = "vanilla" | "tailwind" | "panda" | "stylex" | "native";

/** Add authored/generated CSS to the browser build without affecting SSR inputs. */
export function browserStyles(root: string, kind: SheetKind): Plugin {
  const virtualCss = "virtual:benchmark-browser.css";
  const cssId = `\0${virtualCss}`;
  return {
    name: "benchmark-browser-styles",
    enforce: "pre",
    buildStart() {
      const cases: Record<string, string[]> = {};
      for (const item of readdirSync(resolve(root, "case"), { withFileTypes: true })) {
        const caseId = item.name;
        if (!item.isDirectory() || !existsSync(resolve(root, "case", caseId, "index.tsx"))) continue;
        cases[caseId] = [];
        if (kind === "vanilla") {
          const source = readFileSync(resolve(root, "case", caseId, "styles.css"), "utf8");
          const fileName = `assets/cases/${caseId}.css`;
          this.emitFile({ type: "asset", fileName, source });
          cases[caseId] = [fileName];
        }
      }
      this.emitFile({
        type: "asset",
        fileName: "browser-styles.json",
        source: JSON.stringify({ cases, ...(kind === "tailwind" ? { maxInput: { "dyn-translate": utilityMaxInput } } : {}) }),
      });
    },
    transform(code, id) {
      if (id !== resolve(root, "client-entry.tsx") || kind === "vanilla" || kind === "native") return;
      const stylesheet = kind === "panda" ? resolve(root, "panda.css") : virtualCss;
      return { code: `${code}\nimport ${JSON.stringify(stylesheet)};`, map: null };
    },
    resolveId(id) {
      if (id === virtualCss) return cssId;
    },
    async load(id) {
      if (id !== cssId) return;
      // StyleX appends its collected rules to this linked Vite CSS asset.
      if (kind === "stylex") return "/*! StyleX extracted styles. */";
      if (kind === "tailwind") {
        const [{ default: postcss }, { default: tailwindcss }] = await Promise.all([import("postcss"), import("tailwindcss")]);
        const result = await postcss([tailwindcss({
          content: [resolve(root, "case/**/*.{ts,tsx}")],
          corePlugins: { preflight: false },
          safelist: Array.from({ length: utilityMaxInput + 1 }, (_, i) => `[transform:translateX(${i}px)]`),
        })]).process("@tailwind utilities;", { from: undefined });
        return result.css;
      }
    },
  };
}
