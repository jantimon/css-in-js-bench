// Zyzz SSR entry — build-extracted family. style() and variants() are compiled by the zyzz
// Vite plugin to build-time CSS (grouped output, see zyzz.config.ts), emitted as a sibling sheet. That sheet holds EVERY
// case's rules (one build per tech), so renderCase slices it to the classes THIS render
// used — giving per-case { html, css }. renderHtml is the microbench hot path (no slice).
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "react-dom/server";
import React, { createElement } from "react";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// The zyzz-emitted stylesheet lives next to this bundle (assetFileNames: styles.css), or
// under a sibling assets/ dir. Search both.
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

// Grouped output emits one class per style (and per cx combination). Conditions either wrap the rule
// (@media/@container/@supports) or nest inside it (`.c{&:hover{…}}`), and the cascade between
// conflicting declarations follows sheet order. A slice therefore keeps each rule's wrappers
// and emits in sheet order. Arbitrary-value classes escape their brackets and parentheses
// (`.z-text-\[\#fff\]`), so selectors are read as CSS identifiers, escapes included.
interface LeafRule {
  classes: string[];
  text: string; // the rule with its @media/@container wrappers re-applied
}

// Brace-aware walk over the sheet, in source order. A prelude runs to the next `{` or `;` (parens
// counted, so complex conditions don't split). Conditional groups recurse with their prelude pushed
// onto the wrapper stack; other at-rules (@property) carry no class and are skipped.
function walk(css: string, wrappers: string[], out: LeafRule[]): void {
  const n = css.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    let j = i;
    let paren = 0;
    while (j < n) {
      const c = css[j];
      if (c === "\\") j++; // an escaped character never opens or closes anything
      else if (c === "(") paren++;
      else if (c === ")") paren--;
      else if (paren === 0 && (c === "{" || c === ";")) break;
      j++;
    }
    const prelude = css.slice(i, j).trim();
    if (j >= n) break;
    if (css[j] === ";") {
      i = j + 1; // statement with no block — nothing to slice
      continue;
    }
    let depth = 0;
    let k = j;
    for (; k < n; k++) {
      if (css[k] === "{") depth++;
      else if (css[k] === "}" && --depth === 0) break;
    }
    const body = css.slice(j + 1, k);
    if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@container")) {
      walk(body, [...wrappers, prelude], out);
    } else if (!prelude.startsWith("@")) {
      const classes = [...new Set([...prelude.matchAll(/\.((?:[A-Za-z0-9_-]|\\[0-9a-fA-F]{1,6} ?|\\.)+)/g)].map((m) => unescape(m[1])))];
      const open = wrappers.map((w) => `${w}{`).join("");
      out.push({ classes, text: `${open}${prelude}{${body.trim()}}${"}".repeat(wrappers.length)}` });
    }
    i = k + 1;
  }
}

// CSS identifier escapes back to the raw class name the markup carries.
function unescape(ident: string): string {
  return ident.replace(/\\([0-9a-fA-F]{1,6}) ?|\\(.)/g, (_, hex, ch) => (hex ? String.fromCodePoint(parseInt(hex, 16)) : ch));
}

let leaves: LeafRule[] | null = null;
function rules(): LeafRule[] {
  if (!leaves) {
    const parsed: LeafRule[] = [];
    walk(extractedSheet(), [], parsed);
    leaves = parsed;
  }
  return leaves;
}

// Slice: every leaf rule naming a class this render used, in sheet order. Walking the leaves rather
// than the render's classes keeps the cascade and emits each rule once, comma-shared ones included.
function cssFor(html: string): string {
  const used = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) used.add(t);
  return rules()
    .filter((leaf) => leaf.classes.some((c) => used.has(c)))
    .map((leaf) => leaf.text)
    .join("\n")
    .trim();
}

function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`zyzz: no case/${caseId}/index.tsx`);
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
