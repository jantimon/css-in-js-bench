// cn SSR entry — utility-CSS family. Renders n instances, then produces the CSS
// that markup needs: NOT something the lib authors (cn only joins/merges the class
// strings at runtime) but the REAL Tailwind stylesheet for exactly the utility
// classes that appear in the rendered HTML. Preflight is off, so we measure only the
// utilities used (§6.1, the honest cost); scripts/tailwind.mjs holds the Tailwind
// input and theme.
// Identical CSS strategy to tailwind-merge.
//
// The harness contract renderCase(caseId, n) is SYNCHRONOUS, but Tailwind's compiler
// is async. We bridge that by running it in a short-lived child node process
// (execFileSync) that reads the HTML on stdin and writes the CSS on stdout — keeping
// renderCase sync while still emitting genuine Tailwind output. The child imports
// scripts/tailwind.mjs from the benchmarks root (cwd = the redesign root, derived from
// this file's location so it's independent of the caller's process.cwd()).
import React from "react";
import { renderToString } from "react-dom/server";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// this file builds to techs/<tech>/dist/microbench/entry.mjs → 4 dirs up is redesign/.
const REDESIGN_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// Inline worker: read HTML from stdin, emit the Tailwind CSS for exactly its
// utility classes. Async (Tailwind's compiler is) but invoked synchronously by the
// parent via execFileSync, so renderCase stays sync.
const TW_WORKER = `
let html = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) html += chunk;
const { tailwindCssForHtml } = await import("./scripts/tailwind.mjs");
process.stdout.write(await tailwindCssForHtml(html));
`;

function tailwindCss(html: string): string {
  // React HTML-escapes class attributes (& -> &amp;, " -> &quot;); Tailwind's scanner reads this
  // markup for candidate classes, so the escaped form hides arbitrary-variant utilities such as
  // [&_li]:flex-1. Unescape for the scan so every utility the markup actually uses is generated.
  const scan = html.replace(/&amp;/g, "&").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return execFileSync(process.execPath, ["--input-type=module", "-e", TW_WORKER], {
    input: scan,
    cwd: REDESIGN_ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
}

// Production SSR hot path the microbench times (renderToString + cn's per-element
// class resolution). Tailwind's CSS generation is build-time work, excluded here — see renderCase.
export function renderHtml(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`cn: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return renderToString(React.createElement(React.Fragment, null, children));
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderHtml(caseId, n);
  const css = tailwindCss(html).trim();
  return { html, css };
}
