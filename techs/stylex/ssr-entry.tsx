// StyleX SSR entry — build-atomic family. stylex.create is compiled by the unplugin to
// build-time atomic CSS, emitted as a sibling sheet. That sheet holds EVERY case's atomic
// rules (one build per tech), so renderCase slices it to the classes THIS render used —
// giving per-case { html, css }. renderHtml is the microbench hot path (no slice).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import React, { createElement } from "react";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// The StyleX-emitted atomic stylesheet lives next to this bundle, or — when the SSR
// build has no other CSS asset to merge into — under the sibling assets/ dir (the
// unplugin's writeBundle fallback writes assets/stylex.css). Search both.
let sheet: string | null = null;
function extractedSheet(): string {
  if (sheet !== null) return sheet;
  const dir = dirname(fileURLToPath(import.meta.url));
  for (const base of [dir, join(dir, "assets")]) {
    if (!existsSync(base)) continue;
    const cssFile = readdirSync(base).find((f) => f.endsWith(".css"));
    if (cssFile && existsSync(join(base, cssFile))) {
      sheet = readFileSync(join(base, cssFile), "utf8").trim();
      return sheet;
    }
  }
  sheet = "";
  return sheet;
}

// StyleX atomic rules are FLAT (one declaration per rule), with `:not(#\#)` specificity
// hacks and @media-wrapped variants. Match every leaf rule, key it by the FIRST atomic
// class in its selector, accumulate ALL of that class's rules (base + pseudo + @media).
let ruleMap: Map<string, string> | null = null;
function rules(): Map<string, string> {
  if (ruleMap) return ruleMap;
  ruleMap = new Map();
  for (const m of extractedSheet().matchAll(/((?:\.[A-Za-z0-9_-]+|:[A-Za-z-]+(?:\([^)]*\))?|[\s,>+~*]|\[[^\]]*\])+)\{([^{}]*)\}/g)) {
    const cls = m[1].match(/\.([A-Za-z0-9_-]+)/);
    if (cls) ruleMap.set(cls[1], (ruleMap.get(cls[1]) ?? "") + m[0]);
  }
  return ruleMap;
}
function cssFor(html: string): string {
  const map = rules();
  const seen = new Set<string>();
  let css = "";
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const t of m[1].split(/\s+/))
      if (t && !seen.has(t)) {
        seen.add(t);
        const rule = map.get(t);
        if (rule) css += rule;
      }
  return css.trim();
}

function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`stylex: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => createElement(React.Fragment, { key: i }, render(i)));
  return renderToString(createElement(React.Fragment, null, children));
}

export function renderHtml(caseId: string, n: number): string {
  return renderInstances(caseId, n);
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderInstances(caseId, n);
  return { html, css: cssFor(html) };
}
