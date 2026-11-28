// Coulis SSR entry — runtime atomic family. Coulis creates its atomic rules at runtime
// (once per value, cached for the instance lifetime) and offers two documented ways to
// ship them:
//   • getStyleSheets(): every rule the instance created so far. No HTML needed (the
//     streaming path), and its serialization is reused until a new rule is created.
//   • getCriticalStyleSheets(html): the rules whose class names the HTML uses.
// renderHtml is the microbench hot path: the render (which creates the rules) plus the
// per-request getStyleSheets() collection. The lane's one instance holds the rules of
// EVERY case (one build per tech, like the build-time atomic lanes' sheet), so renderCase
// slices it to the classes THIS render used with getCriticalStyleSheets(html), giving
// per-case { html, css } for the snapshot and payload.
import React from "react";
import { renderToString } from "react-dom/server";
import type { RenderCase, RenderResult } from "../../report/types";
import { getCriticalStyleSheets, getStyleSheets } from "./coulis";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

function renderInstances(caseId: string, n: number): string {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`coulis: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  return renderToString(React.createElement(React.Fragment, null, children));
}

export function renderHtml(caseId: string, n: number): string {
  const html = renderInstances(caseId, n);
  // The style tags a response would carry: collected per request, inside the timing.
  String(getStyleSheets());
  return html;
}

export function renderCase(caseId: string, n: number): RenderResult {
  const html = renderInstances(caseId, n);
  const sheets = getCriticalStyleSheets(html);
  let css = "";
  for (const sheet of sheets) css += sheet.content;
  return { html, css, head: String(sheets) };
}
