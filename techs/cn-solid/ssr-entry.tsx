// cn-solid SSR entry — the cn lane's utility-CSS strategy with Solid 2 in place of
// React, so the pair isolates what the FRAMEWORK costs for a runtime class-merge
// library. cn only joins/merges class strings at runtime; the stylesheet is the real
// Tailwind output for exactly the utility classes in the rendered HTML (preflight
// off — §6.1), built from the lane's tailwind.css by scripts/tailwind-ssr.mjs, as in cn
// and tailwind-merge.
//
// renderCase(caseId, n) is SYNCHRONOUS but Tailwind's compiler is async, so Tailwind runs
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
const LANE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TW_WORKER = `
let html = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) html += chunk;
const { tailwindCssForHtml } = await import("./scripts/tailwind-ssr.mjs");
process.stdout.write(await tailwindCssForHtml(process.argv[1], html));
`;

function tailwindCss(html: string): string {
  // The renderer HTML-escapes class attributes, which hides arbitrary-variant utilities
  // such as [&_li]:flex-1 from Tailwind's scanner. Unescape for the scan.
  const scan = html.replace(/&amp;/g, "&").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return execFileSync(process.execPath, ["--input-type=module", "-e", TW_WORKER, LANE_DIR], {
    input: scan,
    cwd: REDESIGN_ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

// Production SSR hot path the microbench times (renderToString + cn's per-element class
// resolution). Tailwind's CSS generation is build-time work, excluded here — see renderCase.
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
