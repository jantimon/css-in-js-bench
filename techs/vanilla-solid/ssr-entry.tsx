// vanilla-solid SSR entry — built by vite.microbench.config.ts and imported by gen.
// Exposes the uniform { html, css } contract (§6.1) with Solid 2 in place of React: the
// case render functions and their author CSS are discovered from the filesystem
// (import.meta.glob), so this entry is the SAME for every case this tech implements.
import { renderToString } from "@solidjs/web";
import type { SolidRenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: SolidRenderCase }>("./case/*/index.tsx", { eager: true });
const sheets = import.meta.glob<string>("./case/*/styles.css", { eager: true, query: "?raw", import: "default" });

const byCase = <T,>(map: Record<string, T>, caseId: string, file: string): T | undefined =>
  map[`./case/${caseId}/${file}`];

export function renderHtml(caseId: string, n: number): string {
  const mod = byCase(renders, caseId, "index.tsx");
  if (!mod) throw new Error(`vanilla-solid: no case/${caseId}/index.tsx`);
  const render = mod.default;
  // The harness owns the loop: render the case fn n times into one tree (§6). Solid cases
  // take an ACCESSOR (the client entry drives it from a signal for the interaction pass);
  // on the server it is a constant read. noScripts: see yak-solid/ssr-entry.tsx.
  return renderToString(() => Array.from({ length: n }, (_, i) => render(() => i)), { noScripts: true });
}

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  // vanilla-solid ships author-written CSS, deduped → constant regardless of n.
  return { html: renderHtml(caseId, n), css: (byCase(sheets, caseId, "styles.css") ?? "").trim() };
}
