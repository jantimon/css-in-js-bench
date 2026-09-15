// @yak/solid SSR entry — build-extracted-CSS family, Solid 2 instead of React. The
// styled`…` templates are compiled to build-time CSS by the yak SWC plugin and
// consolidated into a sibling stylesheet asset. That sheet holds EVERY case's rules
// (one build per tech), so renderCase slices it to just the classes THIS render used —
// giving per-case { html, css } directly comparable to the React lanes. renderHtml is
// the microbench hot path (no slice).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "@solidjs/web";
import type { SolidRenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });

// The yak-emitted stylesheet lives next to this bundle (assetFileNames: styles.css).
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
  if (!mod) throw new Error(`yak-solid: no case/${caseId}/index.tsx`);
  const render = mod.default;
  // Solid cases take an ACCESSOR (the client entry drives it from a signal for the
  // interaction pass); on the server it is a constant read.
  // noScripts: Solid's inline hydration bootstrap is a DOCUMENT-level tag, and this html
  // is component markup only (the React lanes' runtime doesn't sit in it either).
  // client-entry.tsx installs the same `_$HY` bootstrap instead, so its cost lands in the
  // client bundle, where the framework floor cancels it out. The `_hk` hydration keys on
  // the elements DO stay — that is markup Solid genuinely ships.
  return renderToString(() => Array.from({ length: n }, (_, i) => render(() => i)), { noScripts: true });
}

export function renderHtml(caseId: string, n: number): string {
  return renderInstances(caseId, n);
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderInstances(caseId, n);
  return { html, css: cssFor(html) };
}
