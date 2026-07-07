// vanilla SSR entry — built by vite.microbench.config.ts and imported by gen.
// Exposes the uniform { html, css } contract (§6.1). The case render functions and
// their author CSS are discovered from the filesystem (import.meta.glob), so this
// entry is the SAME for every case this tech implements — adding a case is just a
// new case/<id>/ folder, no edit here.
import React from "react";
import { renderToString } from "react-dom/server";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });
const sheets = import.meta.glob<string>("./case/*/styles.css", { eager: true, query: "?raw", import: "default" });

const byCase = <T,>(map: Record<string, T>, caseId: string, file: string): T | undefined =>
  map[`./case/${caseId}/${file}`];

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const mod = byCase(renders, caseId, "index.tsx");
  if (!mod) throw new Error(`vanilla: no case/${caseId}/index.tsx`);
  const render = mod.default;
  // The harness owns the loop: render the case fn n times into one tree (§6).
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  const html = renderToString(React.createElement(React.Fragment, null, children));
  // vanilla ships author-written CSS, deduped → constant regardless of n.
  const css = (byCase(sheets, caseId, "styles.css") ?? "").trim();
  return { html, css };
}
