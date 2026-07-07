import React from "react";

export interface EditorLane {
  tech: string;
  label: string;
  preview?: string;
}

// A simplified code-editor view of one case (§7): a left sidebar listing every lane (the
// "file list") × top tabs for the three artifacts (input .tsx · generated HTML · generated
// CSS) plus a "preview" tab showing THAT lane's rendered screenshot. The body is a single
// <iframe> (for the code) and an <img> (for the preview) whose src the vanilla controller
// swaps on click — highlighted code files live in assets/code/ (compiled by
// report/code-assets.ts) and the preview PNGs in assets/, so the main report stays small.
// Since every lane renders identically (parity), the preview is the same image for all of
// them — the sidebar's highlighted lane name is what tells you which one you're looking at.
// No hydration; without JS the first lane's .tsx shows.
const TABS = [
  { art: "tsx", file: "index.tsx" },
  { art: "html", file: "output.html" },
  { art: "css", file: "output.css" },
] as const;

const src = (caseId: string, lane: string, art: string) => `assets/code/${caseId}__${lane}__${art}.html`;

export function Editor({ caseId, lanes }: { caseId: string; lanes: EditorLane[] }) {
  const first = lanes[0]?.tech ?? "";
  const hasPreview = lanes.some((l) => l.preview);
  return (
    <div className="editor" data-ed data-case={caseId} data-lane={first} data-art="tsx">
      <div className="ed-side">
        {lanes.map((l) => (
          <button key={l.tech} type="button" className="ed-file" data-tech={l.tech} data-lane={l.tech} data-preview={l.preview ?? ""}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="ed-main">
        <div className="ed-tabs">
          {TABS.map((t) => (
            <button key={t.art} type="button" className="ed-tab" data-art={t.art}>
              {t.file}
            </button>
          ))}
          {hasPreview ? (
            <button type="button" className="ed-tab" data-art="preview">
              preview
            </button>
          ) : null}
        </div>
        <iframe className="ed-frame" title={`${caseId} source`} src={src(caseId, first, "tsx")} loading="lazy" />
        <img className="ed-shot" alt="rendered preview" loading="lazy" />
      </div>
    </div>
  );
}
