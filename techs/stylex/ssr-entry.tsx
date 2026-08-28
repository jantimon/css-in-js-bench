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

// StyleX atomic rules are FLAT (one declaration per rule) with `:not(#\#)` specificity hacks, and
// conditional variants nested under @media/@container. A slice has to keep those wrappers: without
// them the tablet-band title rule applies on a desktop viewport and competes with the desktop one at
// equal specificity. It also has to emit in SHEET order, because that is the tiebreak StyleX leans on
// when two conditional rules set the same property — the title's @media 15px and @container 16px are
// equal-specificity, and the sheet puts @container last, so 16px wins, which is what every other lane
// renders. Each rule is keyed under EVERY atomic class its selector names: StyleX groups identical
// declarations from different create() calls into one comma selector (`.a.a, .b.b { … }`), so keying
// on the first class alone drops the rule for a render that uses only the second.
interface LeafRule {
  classes: string[];
  text: string; // the rule with its @media/@container wrappers re-applied
}

// Brace-aware walk over the sheet, in source order. A prelude runs to the next `{` or `;` (parens
// counted, so complex conditions don't split). Conditional groups recurse with their prelude pushed
// onto the wrapper stack; other at-rules (@property) carry no atomic class and are skipped.
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
      if (c === "(") paren++;
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
      const classes = [...new Set([...prelude.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
      const open = wrappers.map((w) => `${w}{`).join("");
      out.push({ classes, text: `${open}${prelude}{${body.trim()}}${"}".repeat(wrappers.length)}` });
    }
    i = k + 1;
  }
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
