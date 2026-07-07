// Panda (css fn) SSR entry — atomic-prebuilt family. css() returns atomic class
// names at runtime; the CSS is build-time (panda cssgen → ./panda.css, inlined here
// as a string). renderCase returns the slice of that sheet for exactly the atomic
// classes this render used — the same { html, css } contract as every other tech,
// directly comparable to runtime libs' critical CSS (§6.1).
import React from "react";
import { renderToString } from "react-dom/server";
import pandaSheet from "./panda.css?raw";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// class → its full rule text (base + any pseudo rules + any @media/@container/@supports
// variants, each re-wrapped in its at-rule), keyed by the unescaped FIRST atomic class so it
// matches the bare class token in the rendered HTML. A brace-aware walk (not a flat regex) is
// required: Panda nests the responsive/container variants inside @media/@container blocks, and
// a flat `.class{…}` match would lift those rules OUT of their at-rule and apply them
// unconditionally (e.g. the `@container tile (min-width:240px)` title bump firing at every
// width). @layer wrappers are flattened (children emitted at top level — the slice is critical
// CSS, not layer-ordered) but conditional at-rules are preserved verbatim.
let ruleMap: Map<string, string> | null = null;
// Panda tokenizes some literal values (notably the spacing scale — `0` → var(--spacing-0)) and
// DEFINES those vars in a `:root`/`:where(:root,:host)` block under `@layer tokens`. Those root
// blocks carry no atomic class, so a class-keyed slice emits `var(--spacing-0)` with the variable
// UNDEFINED — harmless where the property falls back to its initial value (margin/padding 0) but
// fatal for `bottom: var(--spacing-0)` on the absolutely-positioned active-tab underline, which
// collapses to `bottom: auto` and floats to the top of the anchor. We capture the token table
// here and re-emit only the REFERENCED tokens as a slice preamble (cssFor).
let tokenMap: Map<string, string> | null = null;
const ROOT_SELECTOR = /(?:^|,)\s*(?::root\b|:where\(\s*:root|:host\b|\[data-panda)/i;
function rules(): Map<string, string> {
  if (ruleMap) return ruleMap;
  ruleMap = new Map();
  tokenMap = new Map();
  const src = pandaSheet.replace(/\/\*[\s\S]*?\*\//g, "");
  const cond: string[] = []; // active @media/@container/@supports headers (outermost → innermost)
  let i = 0;
  const add = (selector: string, body: string) => {
    if (ROOT_SELECTOR.test(selector)) {
      for (const d of body.matchAll(/(--(?:\\.|[\w.-])+)\s*:\s*([^;]+);/g))
        if (!tokenMap!.has(d[1])) tokenMap!.set(d[1], d[2].trim());
      return;
    }
    const first = selector.match(/\.((?:\\.|[\w-])+)/);
    if (!first) return; // a rule without a class key (e.g. a @keyframes step) — skip, as before
    const rule = cond.reduceRight((inner, h) => `${h}{${inner}}`, `${selector}{${body}}`);
    const cls = first[1].replace(/\\(.)/g, "$1");
    ruleMap!.set(cls, (ruleMap!.get(cls) ?? "") + rule + "\n");
  };
  const block = () => {
    while (i < src.length) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (i >= src.length || src[i] === "}") { i++; return; }
      const start = i;
      while (i < src.length && src[i] !== "{" && src[i] !== "}" && src[i] !== ";") i++;
      if (src[i] === ";") { i++; continue; } // a statement, e.g. `@layer a, b, c;`
      if (src[i] !== "{") return;
      const header = src.slice(start, i).trim();
      i++; // consume "{"
      const at = header.toLowerCase();
      if (at.startsWith("@layer")) {
        block(); // flatten: descend without wrapping
      } else if (at.startsWith("@media") || at.startsWith("@container") || at.startsWith("@supports")) {
        cond.push(header);
        block();
        cond.pop();
      } else if (header[0] === "@") {
        // @keyframes/@font-face/etc. — consume the block but don't key it (matches prior behavior)
        for (let depth = 1; i < src.length && depth > 0; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
      } else {
        let depth = 1;
        const bodyStart = i;
        for (; i < src.length && depth > 0; i++) depth += src[i] === "{" ? 1 : src[i] === "}" ? -1 : 0;
        add(header, src.slice(bodyStart, i - 1));
      }
    }
  };
  block();
  return ruleMap;
}
function cssFor(html: string): string {
  const map = rules();
  const seen = new Set<string>();
  let css = "";
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const raw of m[1].split(/\s+/)) {
      // class attributes are HTML-escaped (Panda's &-selector and content:"" classes carry
      // &amp; / &quot; in the markup); unescape so tokens match the unescaped rule-map keys.
      const t = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      if (t && !seen.has(t)) {
        seen.add(t);
        const rule = map.get(t);
        if (rule) css += rule + "\n";
      }
    }
  // Prepend the design tokens this slice actually references (resolving nested var() chains), so
  // var(--spacing-0) et al. resolve instead of collapsing to their initial value.
  const need = new Set<string>();
  const want = (text: string) => {
    for (const r of text.matchAll(/var\(\s*(--(?:\\.|[\w.-])+)/g)) {
      const name = r[1];
      if (need.has(name) || !tokenMap!.has(name)) continue;
      need.add(name);
      want(tokenMap!.get(name)!); // a token value may reference further tokens
    }
  };
  want(css);
  if (need.size) {
    const decls = [...need].map((n) => `${n}: ${tokenMap!.get(n)};`).join("");
    css = `:root,:host{${decls}}\n` + css;
  }
  return css.trim();
}

// Production SSR hot path the microbench times: renderToString + css()'s atomic class
// generation. The sheet slice (cssFor) is build-time work, excluded here.
export function renderHtml(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`panda-props: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return renderToString(React.createElement(React.Fragment, null, children));
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderHtml(caseId, n);
  return { html, css: cssFor(html) };
}
