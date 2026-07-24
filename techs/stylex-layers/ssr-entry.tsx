// StyleX SSR entry — build-atomic family, CSS-layers variant (useCSSLayers: true). stylex.create
// is compiled by the unplugin to build-time atomic CSS, emitted as a sibling sheet. That sheet
// holds EVERY case's atomic rules (one build per tech), so renderCase slices it to the classes
// THIS render used — giving per-case { html, css }. renderHtml is the microbench hot path (no slice).
//
// Layers mode makes the sheet NESTED: rules live inside `@layer priorityN { … }` blocks (with
// @media further nested inside a layer), not flat leaf rules. The plain-StyleX lane's flat-regex
// slice would silently drop every @layer wrapper, so this lane walks the sheet brace-aware,
// tags each leaf rule with its enclosing layer, and re-emits the selected rules grouped back
// into their `@layer` blocks in sheet (priority) order.
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

// A leaf StyleX rule tagged with the @layer it sits under (null for the unlayered tier).
interface LeafRule {
  layer: string | null;
  cls: string | null; // FIRST atomic class in the selector — the slice key
  text: string; // the leaf rule itself, `selector{decls}`, WITHOUT any @layer/@media wrapper
}

// Brace-aware walk over the nested layers sheet, in source order. Preludes are read up to the
// next `{` or `;` (parens counted, so complex @media conditions don't split). `@layer name { … }`
// recurses with that layer; conditional groups (@media/@supports/@container) recurse KEEPING the
// current layer and DROP their own wrapper (parity with the plain lane, which never carried @media
// context into the slice); other at-rules (@property, @keyframes, `@layer name;` order statements)
// carry no atomic class and are skipped; a style rule becomes one LeafRule keyed by its first class.
let leaves: LeafRule[] | null = null;
function walk(css: string, layer: string | null, out: LeafRule[]): void {
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
      i = j + 1; // statement with no block (e.g. `@layer priority1;`) — nothing to slice
      continue;
    }
    // css[j] === "{" — find the matching close brace
    let depth = 0;
    let k = j;
    for (; k < n; k++) {
      if (css[k] === "{") depth++;
      else if (css[k] === "}" && --depth === 0) break;
    }
    const body = css.slice(j + 1, k);
    if (prelude.startsWith("@layer")) {
      walk(body, prelude.slice("@layer".length).trim(), out);
    } else if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@container")) {
      walk(body, layer, out);
    } else if (!prelude.startsWith("@")) {
      const cls = prelude.match(/\.([A-Za-z0-9_-]+)/);
      out.push({ layer, cls: cls ? cls[1] : null, text: `${prelude}{${body}}`.trim() });
    }
    i = k + 1;
  }
}
function rules(): LeafRule[] {
  if (leaves) return leaves;
  leaves = [];
  walk(extractedSheet(), null, leaves);
  return leaves;
}

// Slice: pick the leaf rules whose key class the render used, then re-emit them grouped by
// @layer in sheet (priority) order. Layer wrappers are preserved (that is the whole point of the
// variant); unlayered leaves stay bare. Grouping by first-appearance keeps the output balanced
// and its layer order the cascade order.
function cssFor(html: string): string {
  const used = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) used.add(t);
  const order: string[] = [];
  const buckets = new Map<string, string[]>();
  for (const leaf of rules()) {
    if (!leaf.cls || !used.has(leaf.cls)) continue;
    const key = leaf.layer ?? "";
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(leaf.text);
  }
  let css = "";
  for (const key of order) {
    const texts = buckets.get(key)!.join("\n");
    css += key === "" ? `${texts}\n` : `@layer ${key}{\n${texts}\n}\n`;
  }
  return css.trim();
}

function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`stylex-layers: no case/${caseId}/index.tsx`);
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
