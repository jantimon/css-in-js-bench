// StyleX SSR entry with Solid 2 in place of React, so the pair isolates what the FRAMEWORK
// costs a build-time atomic library. stylex.create is compiled by the unplugin to build-time
// atomic CSS, emitted as a sibling sheet. That sheet holds EVERY case's atomic rules (one build
// per tech), so renderCase slices it to the classes THIS render used — giving per-case
// { html, css }. renderHtml is the microbench hot path (no slice).
//
// The cases call stylex.attrs() where the React lanes call stylex.props(): same styleq merge,
// but it returns { class, style-as-string } instead of { className, style-as-object }, which is
// what a non-React renderer wants. StyleX itself has no framework dependency at all.
//
// Layers mode makes the sheet NESTED: rules live inside `@layer priorityN { … }` blocks (with
// @media further nested inside a layer), not flat leaf rules. The plain-StyleX lane's flat-regex
// slice would silently drop every @layer wrapper, so this lane walks the sheet brace-aware,
// tags each leaf rule with its enclosing layer, and re-emits the selected rules grouped back
// into their `@layer` blocks in sheet (priority) order.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "@solidjs/web";
import type { SolidRenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });

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
  // EVERY distinct atomic class the selector names — all of them are slice keys. StyleX
  // groups identical declarations that came from different create() calls into one
  // comma selector (`.xcbqznd.xcbqznd, .x13fgddh.x13fgddh { … }`), which happens as soon
  // as two modules declare the same style. Keying on the first class alone silently drops
  // the rule for every later class, so a render using only the second gets no CSS.
  classes: string[];
  text: string; // the rule with its @media/@container wrappers re-applied, but no @layer
}

// Brace-aware walk over the nested layers sheet, in source order. Preludes are read up to the
// next `{` or `;` (parens counted, so complex @media conditions don't split). `@layer name { … }`
// recurses with that layer; conditional groups (@media/@supports/@container) recurse with their
// prelude pushed onto the wrapper stack, so the slice keeps the condition — without it a
// tablet-band rule would apply on a desktop viewport; other at-rules (@property, @keyframes,
// `@layer name;` order statements) carry no atomic class and are skipped.
let leaves: LeafRule[] | null = null;
function walk(css: string, layer: string | null, wrappers: string[], out: LeafRule[]): void {
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
      walk(body, prelude.slice("@layer".length).trim(), wrappers, out);
    } else if (prelude.startsWith("@media") || prelude.startsWith("@supports") || prelude.startsWith("@container")) {
      walk(body, layer, [...wrappers, prelude], out);
    } else if (!prelude.startsWith("@")) {
      const classes = [...new Set([...prelude.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
      const open = wrappers.map((w) => `${w}{`).join("");
      out.push({ layer, classes, text: `${open}${prelude}{${body.trim()}}${"}".repeat(wrappers.length)}` });
    }
    i = k + 1;
  }
}

// The layers in sheet (priority) order; "" is the unlayered tier.
let layerSeq: string[] | null = null;
function rules(): { parsed: LeafRule[]; layers: string[] } {
  if (!leaves || !layerSeq) {
    const parsed: LeafRule[] = [];
    walk(extractedSheet(), null, [], parsed);
    const seq: string[] = [];
    const seen = new Set<string>();
    for (const leaf of parsed) {
      const key = leaf.layer ?? "";
      if (!seen.has(key)) {
        seen.add(key);
        seq.push(key);
      }
    }
    leaves = parsed;
    layerSeq = seq;
  }
  return { parsed: leaves, layers: layerSeq };
}

// Slice: every leaf rule naming a class this render used, re-emitted grouped by @layer. Two cascade
// keys must match the plain (:not-hack) lane so both render pixel-identically: LAYER PRECEDENCE —
// emit layers in sheet (priority) order, so the highest-priority layer comes last and wins, mirroring
// the plain lane's escalating `:not(#\#)` specificity; and SOURCE ORDER within a layer, which is the
// tiebreak when two equal-specificity conditional rules set the same property (the title's @media
// 15px and @container 16px — the sheet puts @container last, so 16px wins).
function cssFor(html: string): string {
  const { parsed, layers } = rules();
  const used = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const t of m[1].split(/\s+/)) if (t) used.add(t);
  const buckets = new Map<string, string[]>();
  for (const leaf of parsed) {
    if (!leaf.classes.some((c) => used.has(c))) continue;
    const key = leaf.layer ?? "";
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(leaf.text);
  }
  let css = "";
  for (const key of layers) {
    const texts = buckets.get(key);
    if (!texts) continue;
    css += key === "" ? `${texts.join("\n")}\n` : `@layer ${key}{\n${texts.join("\n")}\n}\n`;
  }
  return css.trim();
}

// Solid cases take an ACCESSOR (the client entry drives it from a signal for the interaction
// pass); on the server it is a constant read. noScripts: Solid's inline hydration bootstrap is a
// DOCUMENT-level tag and this html is component markup only — client-entry.tsx installs the same
// `_$HY` bootstrap instead, so its cost lands in the client bundle where the framework floor
// cancels it out. The `_hk` hydration keys on the elements DO stay; that is markup Solid ships.
function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`stylex-solid: no case/${caseId}/index.tsx`);
  const render = mod.default;
  return renderToString(() => Array.from({ length: n }, (_, i) => render(() => i)), { noScripts: true });
}

export function renderHtml(caseId: string, n: number): string {
  return renderInstances(caseId, n);
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderInstances(caseId, n);
  return { html, css: cssFor(html) };
}
