// Bamboo Solid SSR entry — built by vite.microbench.config.ts and imported by gen. The
// @bamboocss/vite compiler replaces every css() call with its class-string literal at
// build time, so the markup carries precompiled atomic classes and no styling code runs
// per render (only the cx() joins a component's runtime class prop needs). The CSS is
// build-time (bamboo cssgen → ./bamboo.css, inlined here as a string, plus the
// virtual:bamboo.css import the compiler requires in the entry graph). renderCase returns
// the slice of that sheet for exactly the atomic classes this render used — the same
// { html, css } contract as every other tech (§6.1), and the same slice as the Bamboo
// React lane's.
import { renderToString } from "@solidjs/web";
import "virtual:bamboo.css";
import bambooSheet from "./bamboo.css?raw";
import type { SolidRenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });

// class → its full rule text (base + any pseudo rules + any @media/@container/@supports
// variants, each re-wrapped in its at-rule), keyed by every class the selector names so it
// matches the bare class token in the rendered HTML. A brace-aware walk (not a flat regex) is
// required: Bamboo nests the responsive/container variants inside @media/@container blocks, and
// a flat `.class{…}` match would lift those rules OUT of their at-rule. @layer wrappers are
// flattened (the slice is critical CSS, not layer-ordered) but conditional at-rules are kept.
let ruleMap: Map<string, string> | null = null;
// Bamboo tokenizes some literal values (e.g. `transparent` → var(--colors-transparent)) and
// DEFINES those vars in a `:root`/`:where(:root,:host)` block under `@layer tokens`. Those root
// blocks carry no atomic class, so the slice re-emits the REFERENCED tokens as a preamble
// (cssFor) — without it `bottom: var(--spacing-0)` on the active-tab underline is undefined.
let tokenMap: Map<string, string> | null = null;
const ROOT_SELECTOR = /(?:^|,)\s*(?::root\b|:where\(\s*:root|:host\b|\[data-bamboo)/i;
function rules(): Map<string, string> {
  if (ruleMap) return ruleMap;
  ruleMap = new Map();
  tokenMap = new Map();
  const src = bambooSheet.replace(/\/\*[\s\S]*?\*\//g, "");
  const cond: string[] = []; // active @media/@container/@supports headers (outermost → innermost)
  let i = 0;
  const add = (selector: string, body: string) => {
    if (ROOT_SELECTOR.test(selector)) {
      // The sheet is minified, which drops the `;` after a block's last declaration.
      for (const d of body.matchAll(/(--(?:\\.|[\w.-])+)\s*:\s*([^;]+)(?:;|$)/g))
        if (!tokenMap!.has(d[1])) tokenMap!.set(d[1], d[2].trim());
      return;
    }
    // Bamboo shares one declaration atom across conditions with a comma selector, so a rule
    // must be reachable from EVERY class it names. cssFor dedupes by rule text.
    const classes = [...selector.matchAll(/\.((?:\\.|[\w-])+)/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
    if (!classes.length) return; // a rule without a class key (e.g. a @keyframes step)
    const rule = cond.reduceRight((inner, h) => `${h}{${inner}}`, `${selector}{${body}}`);
    for (const cls of new Set(classes)) ruleMap!.set(cls, (ruleMap!.get(cls) ?? "") + rule + "\n");
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
        // @keyframes/@font-face/etc. — consume the block but don't key it
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
  const emitted = new Set<string>(); // rule text — comma-shared atoms are keyed under every class
  let css = "";
  for (const m of html.matchAll(/class="([^"]*)"/g))
    for (const raw of m[1].split(/\s+/)) {
      // class attributes are HTML-escaped; unescape so tokens match the unescaped rule-map keys.
      const t = raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, String.fromCharCode(34)).replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      if (t && !seen.has(t)) {
        seen.add(t);
        const rule = map.get(t);
        if (rule && !emitted.has(rule)) {
          emitted.add(rule);
          css += rule + "\n";
        }
      }
    }
  // Prepend the design tokens this slice actually references (resolving nested var() chains).
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

// Production SSR hot path the microbench times: renderToString over precompiled class
// strings. The sheet slice (cssFor) is build-time work, excluded here.
export function renderHtml(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`bamboo-solid: no case/${caseId}/index.tsx`);
  const render = mod.default;
  // The harness owns the loop: render the case fn n times into one tree (§6). Solid cases
  // take an ACCESSOR (the client entry drives it from a signal for the interaction pass);
  // on the server it is a constant read. noScripts: see yak-solid/ssr-entry.tsx.
  return renderToString(() => Array.from({ length: n }, (_, i) => render(() => i)), { noScripts: true });
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const html = renderHtml(caseId, n);
  return { html, css: cssFor(html) };
}
