// next-yak (css prop) SSR entry — build-extracted-CSS family. The css`…` is compiled
// to build-time CSS by viteYak and consolidated into a sibling stylesheet asset. That
// sheet holds EVERY case's rules (one build per tech), so renderCase slices it to just
// the classes THIS render used — giving per-case { html, css } directly comparable to
// the runtime libs' critical CSS (§6.1). renderHtml is the microbench hot path (no slice).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import { createElement, Fragment } from "react";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// The viteYak-emitted stylesheet lives next to this bundle (assetFileNames: styles.css).
let sheet: string | null = null;
function extractedSheet(): string {
  if (sheet !== null) return sheet;
  const dir = dirname(fileURLToPath(import.meta.url));
  const cssFile = readdirSync(dir).find((f) => f.endsWith(".css"));
  sheet = cssFile && existsSync(join(dir, cssFile)) ? readFileSync(join(dir, cssFile), "utf8") : "";
  return sheet;
}

// Split a stylesheet into TOP-LEVEL rules, brace-aware (yak emits modern NESTED CSS —
// `.c{ …; @media{ &:hover{…} } }` — so a flat `{…}` regex would mis-split). Each top
// rule keeps its full nested body.
function topRules(sheet: string): { selector: string; rule: string }[] {
  const out: { selector: string; rule: string }[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < sheet.length; i++) {
    const ch = sheet[i];
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      const rule = sheet.slice(start, i + 1);
      out.push({ selector: rule.slice(0, rule.indexOf("{")), rule });
      start = i + 1;
    }
  }
  return out;
}

// Slice the full (all-cases) sheet to the rules whose TOP-LEVEL selector references a
// class present in `html` — yak reuses one class across its nested base/pseudo/@media
// rules, so the whole top rule comes along.
let parsed: { selector: string; rule: string }[] | null = null;
function cssFor(html: string): string {
  parsed ??= topRules(extractedSheet());
  const used = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) used.add(t);
  let css = "";
  for (const { selector, rule } of parsed) {
    const selClasses = [...selector.matchAll(/\.([\w-]+)/g)].map((s) => s[1]);
    if (selClasses.some((c) => used.has(c))) css += rule;
  }
  return css.trim();
}

function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`next-yak: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => createElement(Fragment, { key: i }, render(i)));
  return renderToString(createElement(Fragment, null, children));
}

export function renderHtml(caseId: string, n: number): string {
  return renderInstances(caseId, n);
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderInstances(caseId, n);
  return { html, css: cssFor(html) };
}
