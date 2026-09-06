// Emotion SSR entry — runtime-CSS family. Emotion injects styles at runtime, so we
// render n instances through a per-render cache (CacheProvider, which @emotion/styled
// reads from context) and pull the critical CSS for exactly this render with
// @emotion/server (§6.1). For dynamic values Emotion makes a class per value, so this
// CSS GROWS with n — the honest cost the payload measurement captures. Case render fns
// are discovered from the filesystem (identical to every other tech's entry).
import React from "react";
import { renderToString } from "react-dom/server";
import createCache from "@emotion/cache";
import createEmotionServer from "@emotion/server/create-instance";
import { CacheProvider } from "@emotion/react";
import type { RenderCase, RenderResult } from "../../report/types";
import { cacheKey } from "./cache-key";

const renders = import.meta.glob<{ default: RenderCase }>("./case/*/index.tsx", { eager: true });

export function renderCase(caseId: string, n: number): RenderResult {
  const mod = renders[`./case/${caseId}/index.tsx`];
  if (!mod) throw new Error(`emotion: no case/${caseId}/index.tsx`);
  const render = mod.default;
  const cache = createCache({ key: cacheKey });
  const server = createEmotionServer(cache);
  const children = Array.from({ length: n }, (_, i) => React.createElement(React.Fragment, { key: i }, render(i)));
  const html = renderToString(
    React.createElement(CacheProvider, { value: cache }, React.createElement(React.Fragment, null, children)),
  );
  const chunks = server.extractCriticalToChunks(html);
  const css = chunks.styles.map((s) => s.css).join("").trim();
  return { html, css, head: server.constructStyleTagsFromChunks(chunks) };
}
