// cn-solid SSR entry — the cn lane's utility-CSS strategy with Solid 2 in place of
// React, so the pair isolates what the FRAMEWORK costs for a runtime class-merge
// library. cn only joins/merges class strings at runtime; the stylesheet is the real
// Tailwind JIT output for exactly the utility classes in the rendered HTML (preflight
// off — §6.1), generated the same way as in the cn and tailwind-merge lanes.
//
// renderCase(caseId, n) is SYNCHRONOUS but Tailwind v3's JIT is async, so the JIT runs
// in a short-lived child process (execFileSync) that reads HTML on stdin and writes CSS
// on stdout. Identical to techs/cn/ssr-entry.tsx; only the renderer differs.
import { renderToString } from "@solidjs/web";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SolidRenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });

// this file builds to techs/<tech>/dist/microbench/entry.mjs → 4 dirs up is redesign/.
const REDESIGN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const TW_WORKER = `
let html = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) html += chunk;
const { default: tailwindcss } = await import("tailwindcss");
const { default: postcss } = await import("postcss");
const tw = tailwindcss({ content: [{ raw: html, extension: "html" }], corePlugins: { preflight: false } });
const res = await postcss([tw]).process("@tailwind utilities;", { from: undefined });
process.stdout.write(res.css);
`;

function tailwindCss(html: string): string {
  // The renderer HTML-escapes class attributes, which hides arbitrary-variant utilities
  // such as [&_li]:flex-1 from Tailwind's scanner. Unescape for the scan.
  const scan = html.replace(/&amp;/g, "&").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return execFileSync(process.execPath, ["--input-type=module", "-e", TW_WORKER], {
    input: scan,
    cwd: REDESIGN_ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

// Production SSR hot path the microbench times (renderToString + cn's per-element class
// resolution). The Tailwind JIT is build-time work, excluded here — see renderCase.
// Solid cases take an ACCESSOR; on the server it is a constant read. noScripts: the
// benchmark renders component markup only, with the hydration bootstrap in the client
// bundle instead — see yak-solid/ssr-entry.tsx.
export function renderHtml(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`cn-solid: no case/${caseId}/index.tsx`);
  const render = mod.default;
  return renderToString(() => Array.from({ length: n }, (_, i) => render(() => i)), { noScripts: true });
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderHtml(caseId, n);
  return { html, css: tailwindCss(html).trim() };
}
