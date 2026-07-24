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
// Leaves indexed by their key class, plus the layers in sheet (priority) order.
let classMap: Map<string, LeafRule[]> | null = null;
let layerSeq: string[] | null = null; // "" is the unlayered tier; ascending priority order
function rules(): { byClass: Map<string, LeafRule[]>; layers: string[] } {
  if (classMap && layerSeq) return { byClass: classMap, layers: layerSeq };
  const parsed: LeafRule[] = [];
  walk(extractedSheet(), null, parsed);
  classMap = new Map();
  layerSeq = [];
  const seenLayer = new Set<string>();
  for (const leaf of parsed) {
    const key = leaf.layer ?? "";
    if (!seenLayer.has(key)) {
      seenLayer.add(key);
      layerSeq.push(key);
    }
    if (!leaf.cls) continue;
    (classMap.get(leaf.cls) ?? classMap.set(leaf.cls, []).get(leaf.cls)!).push(leaf);
  }
  return { byClass: classMap, layers: layerSeq };
}

// Slice: pick the leaf rules whose key class the render used and re-emit them grouped by @layer.
// Two cascade keys must match the plain (:not-hack) lane so both render pixel-identically: (1) LAYER
// PRECEDENCE — emit layers in sheet (priority) order, so the highest-priority layer comes last and
// wins, mirroring the plain lane's escalating `:not(#\#)` specificity; (2) SOURCE-ORDER TIEBREAK
// within a layer — walk the render's classes in HTML-appearance order (exactly what the plain lane's
// slice does), so when two equal-specificity rules set the same property the same one lands last.
// Ordering within a layer by raw sheet order instead would flip such ties (e.g. product-grid's title
// stacks a 15px @media and a 16px @container font-size in one layer — HTML order keeps 15px last).
function cssFor(html: string): string {
  const { byClass, layers } = rules();
  const buckets = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const t of m[1].split(/\s+/))
      if (t && !seen.has(t)) {
        seen.add(t);
        for (const leaf of byClass.get(t) ?? []) {
          const key = leaf.layer ?? "";
          (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(leaf.text);
        }
      }
  let css = "";
  for (const key of layers) {
    const texts = buckets.get(key);
    if (!texts) continue;
    css += key === "" ? `${texts.join("\n")}\n` : `@layer ${key}{\n${texts.join("\n")}\n}\n`;
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
