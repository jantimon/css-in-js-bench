import React from "react";
import { TechLabel } from "./TechLabel.tsx";

export interface EditorLane {
  tech: string;
  label: string;
  preview?: string;
  /** authored file names for THIS lane, index.tsx first (from the cell's snapshot) */
  files: string[];
}

// A simplified code-editor view of one case (§7): a left sidebar listing every lane (the
// "file list") × a tab row for that lane's artifacts. The row runs
// `preview │ index.tsx … │ → output.html → output.css` — the rendered screenshot first,
// then the authored files, then the generated pair behind an arrow, so an authored
// styles.css can't be mistaken for a generated output.css two tabs away.
//
// File sets differ per lane (goober carries a setup.ts, StyleX a tokens.stylex.ts, vanilla
// a styles.css), so EVERY lane's tabs are rendered and CSS hides all but the active lane's.
// That keeps the report static — no hydration, and the tab row is still populated with JS
// off, matching how the rest of the page works.
//
// The body is a single <iframe> (for code) and an <img> (for the preview) whose src the
// vanilla controller swaps on click. Highlighted files live in assets/code/ (compiled by
// report/code-assets.ts) and preview PNGs in assets/, so the main report stays small.
// Since every lane renders identically (parity), the preview is the same image for all of
// them — the highlighted lane name is what tells you which one you're looking at.
const GENERATED = [
  { art: "html", file: "output.html" },
  { art: "css", file: "output.css" },
] as const;

const src = (caseId: string, lane: string, art: string) => `assets/code/${caseId}__${lane}__${art}.html`;

export function Editor({ caseId, lanes }: { caseId: string; lanes: EditorLane[] }) {
  const first = lanes[0];
  const hasPreview = lanes.some((l) => l.preview);
  return (
    <div className="editor" data-ed data-case={caseId} data-lane={first?.tech ?? ""} data-art={hasPreview ? "preview" : "src-index.tsx"}>
      <div className="ed-side">
        {lanes.map((l) => (
          <button key={l.tech} type="button" className="ed-file" data-tech={l.tech} data-lane={l.tech} data-preview={l.preview ?? ""}>
            <TechLabel tech={l.tech} label={l.label} />
          </button>
        ))}
      </div>
      <div className="ed-main">
        {lanes.map((l, i) => (
          <div key={l.tech} className={i === 0 ? "ed-tabs ed-tabs-first" : "ed-tabs"} data-tabs-lane={l.tech}>
            {l.preview ? (
              <>
                <button type="button" className="ed-tab" data-art="preview">
                  preview
                </button>
                <span className="ed-div" aria-hidden="true" />
              </>
            ) : null}
            {l.files.map((f) => (
              <button key={f} type="button" className="ed-tab" data-art={`src-${f}`} data-stem={f.slice(0, f.lastIndexOf("."))}>
                {f}
              </button>
            ))}
            <span className="ed-div" aria-hidden="true" />
            {GENERATED.map((g) => (
              <button key={g.art} type="button" className="ed-tab ed-gen" data-art={g.art}>
                {g.file}
              </button>
            ))}
          </div>
        ))}
        {/* With JS off the preview <img> never gets a src, so the frame falls back to the entry file. */}
        <iframe className="ed-frame" title={`${caseId} source`} src={src(caseId, first?.tech ?? "", "src-index.tsx")} loading="lazy" />
        <img className="ed-shot" alt="rendered preview" loading="lazy" />
      </div>
    </div>
  );
}
