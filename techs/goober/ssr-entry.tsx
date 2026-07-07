// Goober SSR entry — runtime-CSS family. Goober collects styles into a global sheet,
// so we render n instances and then pull everything emitted for this render with
// extractCss() (§6.1). For dynamic values Goober makes a class per value, so this CSS
// GROWS with n — the honest cost the payload measurement captures. The setup(React.
// createElement, ...) call goober needs lives in the case module (see case header).
// Case render fns are discovered from the filesystem (identical to every other entry).
import React from "react";
import { renderToString } from "react-dom/server";
import { extractCss } from "goober";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`goober: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  const html = renderToString(React.createElement(React.Fragment, null, children));
  const css = extractCss().trim();
  return { html, css };
}
