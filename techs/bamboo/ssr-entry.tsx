// Bamboo SSR entry — atomic-prebuilt family, one step past Panda: the
// @bamboocss/vite compiler replaces every css() call with its class-string
// literal at build time, so the markup below carries precompiled atomic classes
// and no styling code runs per render (only cx() string joins for conditionals).
// The CSS is build-time (bamboo cssgen → ./bamboo.css, inlined here as a string,
// plus the virtual:bamboo.css import the compiler requires in the entry graph).
// renderCase returns the slice of that sheet for exactly the atomic classes this
// render used — the same { html, css } contract as every other tech, directly
// comparable to runtime libs' critical CSS (§6.1).
import React from "react";
import { renderToString } from "react-dom/server";
import "virtual:bamboo.css";
import bambooSheet from "./bamboo.css?raw";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

// The sheet's rules, in the order it writes them, each with the @media/@container/@supports headers
// around it (outermost first) and the classes its selector names, unescaped so they match the bare
// class tokens in the rendered HTML. A brace-aware walk (not a flat regex) is required: Bamboo nests
// the responsive/container variants inside @media/@container blocks, and a flat `.class{…}` match
// would lift those rules OUT of their at-rule and apply them unconditionally (e.g. the
// `@container tile (min-width:240px)` title bump firing at every width).
//
// @layer wrappers are flattened, so the slice is plain rules, and between two of equal specificity
// the later one wins. That keeps the sheet's cascade only because the sheet opens each layer once,
// in the order its `@layer` statement declares them, so a later rule is in the same layer or a later
// one; the walk throws on a sheet that reopens a layer. The slice keeps the sheet's order for the
// same reason: in the order classes first appear in the markup, product-grid's
// `@media (prefers-reduced-motion: reduce){transition:none}` came before the `transition: color` it
// overrides, so reduced motion kept a transition the shipped sheet turns off.
interface SheetRule {
  at: string[];
  text: string;
  classes: string[];
}
let sheetRules: SheetRule[] | null = null;
// Bamboo, like Panda, tokenizes some literal values (e.g. `transparent` → var(--colors-transparent)) and
// DEFINES those vars in a `:root`/`:where(:root,:host)` block under `@layer tokens`. Those root
// blocks carry no atomic class, so a class-keyed slice emits `var(--spacing-0)` with the variable
// UNDEFINED — harmless where the property falls back to its initial value (margin/padding 0) but
// fatal for `bottom: var(--spacing-0)` on the absolutely-positioned active-tab underline, which
// collapses to `bottom: auto` and floats to the top of the anchor. We capture the token table
// here and re-emit only the REFERENCED tokens as a slice preamble (cssFor).
let tokenMap: Map<string, string> | null = null;
const ROOT_SELECTOR = /(?:^|,)\s*(?::root\b|:where\(\s*:root|:host\b|\[data-bamboo)/i;
function rules(): SheetRule[] {
  if (sheetRules) return sheetRules;
  sheetRules = [];
  tokenMap = new Map();
  const src = bambooSheet.replace(/\/\*[\s\S]*?\*\//g, "");
  const cond: string[] = []; // active @media/@container/@supports headers (outermost → innermost)
  const layers: string[] = []; // the @layer blocks the walk is inside (outermost → innermost)
  const opened = new Set<string>(); // every @layer block opened so far, by its path
  let i = 0;
  const add = (selector: string, body: string) => {
    if (ROOT_SELECTOR.test(selector)) {
      // The sheet is minified, which drops the `;` after a block's last declaration.
      for (const d of body.matchAll(/(--(?:\\.|[\w.-])+)\s*:\s*([^;]+)(?:;|$)/g))
        if (!tokenMap!.has(d[1])) tokenMap!.set(d[1], d[2].trim());
      return;
    }
    // Bamboo shares one declaration atom across conditions with a comma selector
    // (`.after\:pos_absolute::after,.before\:pos_absolute::before{…}`), so a rule is the page's when
    // ANY class it names is in the markup — a render may use only the second.
    const classes = [...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
    if (!classes.length) return; // a rule without a class key (e.g. a @keyframes step) — skip, as before
    sheetRules!.push({ at: [...cond], text: `${selector}{${body}}`, classes });
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
        // flatten: descend without wrapping
        const name = header.slice("@layer".length).trim();
        const path = [...layers, name].join(".");
        if (opened.has(path)) throw new Error(`bamboo: the sheet reopens @layer ${path}, so its order is not the cascade's`);
        opened.add(path);
        layers.push(name);
        block();
        layers.pop();
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
  return sheetRules;
}
function cssFor(html: string): string {
  const used = new Set<string>();
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const raw of m[1].split(/\s+/)) {
      // class attributes are HTML-escaped (Bamboo's &-selector and content:"" classes carry
      // &amp; / &quot; in the markup); unescape so tokens match the unescaped rule keys.
      const t = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      if (t) used.add(t);
    }
  // The page's rules in the sheet's order, each at-rule opened once for the run of rules inside it.
  let css = "";
  let open: string[] = [];
  for (const rule of rules()) {
    if (!rule.classes.some((cls) => used.has(cls))) continue;
    let kept = 0;
    while (kept < open.length && kept < rule.at.length && open[kept] === rule.at[kept]) kept++;
    css += "}".repeat(open.length - kept);
    for (const header of rule.at.slice(kept)) css += `${header}{`;
    open = rule.at;
    css += rule.text + "\n";
  }
  css += "}".repeat(open.length);
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

// Production SSR hot path the microbench times: renderToString over precompiled
// class strings. The sheet slice (cssFor) is build-time work, excluded here.
export function renderHtml(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`bamboo: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return renderToString(React.createElement(React.Fragment, null, children));
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderHtml(caseId, n);
  return { html, css: cssFor(html) };
}
