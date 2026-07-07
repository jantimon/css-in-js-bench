// styled-components SSR entry — runtime-CSS family. Renders n instances inside a
// ServerStyleSheet and returns the critical CSS it injected (§6.1). For dynamic
// values styled-components makes a class per value, so this CSS GROWS with n — that
// is the honest cost the payload measurement captures. Case render fns are discovered
// from the filesystem (identical to every other tech's entry).
import React from "react";
import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import type { RenderCase } from "../../report/types";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

const stripStyleTags = (s: string) => s.replace(/<style[^>]*>/g, "").replace(/<\/style>/g, "");

export function renderCase(caseId: string, n: number): { html: string; css: string } {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`styled-components: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const sheet = new ServerStyleSheet();
  try {
    const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
    const html = renderToString(sheet.collectStyles(React.createElement(React.Fragment, null, children)));
    const css = stripStyleTags(sheet.getStyleTags()).trim();
    return { html, css };
  } finally {
    sheet.seal();
  }
}
