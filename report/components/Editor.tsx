import React from "react";
import { TechLabel } from "./TechLabel.tsx";
import { Note } from "./Note.tsx";

export interface EditorLane {
  tech: string;
  label: string;
  preview?: string;
  /** authored file names for THIS lane, index.tsx first (from the cell's snapshot) */
  files: string[];
  /** the lane's not-compatible.md when it has no cell for this case; files is then empty */
  note?: string;
}

// A simplified code-editor view of one case (§7): a left sidebar listing every lane (the
// "file list") × a tab row for that lane's artifacts. The row runs
// `preview | index.tsx … | → output.html → output.css` as three separate bars with a gap
// between them — the rendered screenshot first, then the authored files, then the generated
// pair behind an arrow, so an authored styles.css can't be mistaken for a generated
// output.css two tabs away. Grouping by gap rather than by a rule keeps one line weight in
// the row: thin separators inside a bar, empty space between bars.
//
// File sets differ per lane (goober carries a setup.ts, StyleX a tokens.stylex.ts, vanilla
// a styles.css), so EVERY lane's tabs are rendered and CSS hides all but the active lane's.
// That keeps the report static — no hydration, and the tab row is still populated with JS
// off, matching how the rest of the page works.
//
// A lane that holds a not-compatible.md for this case instead of a cell is listed too,
// struck through. Its row has one tab, the note itself, rendered inline in the body where
// the code would be, so the reader learns why that library has no cell rather than
// wondering whether nobody wrote it.
//
// The body is a single <iframe> (for code) and an <img> (for the preview) whose src the
// vanilla controller (CONTROLLER in report.tsx) swaps on click. data-lane and data-art on
// the root are the state it starts from. Highlighted files live in assets/code/ (compiled
// by report/code-assets.ts) and preview images in assets/, so the main report stays small.
// Since every lane renders identically (parity), the preview is the same image for all of
// them — literally the same file, since screenshots are named by a hash of their pixels.
// The highlighted lane name is what tells you which one you're looking at.
//
// The editor opens on the preview. Until the reader clicks a tab, a lane click opens that
// lane's index.tsx rather than keeping the preview, so a reader clicking through lanes
// meets the source instead of the same image again. After a tab was chosen, lane clicks
// keep it (matched by name, then by stem across extensions).
const GENERATED = [
  { art: "html", file: "output.html" },
  { art: "css", file: "output.css" },
] as const;

const src = (caseId: string, lane: string, art: string) => `assets/code/${caseId}__${lane}__${art}.html`;

export function Editor({ caseId, lanes, caseIds }: { caseId: string; lanes: EditorLane[]; caseIds: string[] }) {
  // the editor starts on the first lane that has a cell; note lanes are never the entry
  const entry = lanes.find((l) => !l.note) ?? lanes[0];
  const hasPreview = lanes.some((l) => l.preview);
  return (
    <div className="editor" data-ed data-case={caseId} data-lane={entry?.tech ?? ""} data-art={hasPreview ? "preview" : "src-index.tsx"}>
      <div className="ed-side">
        {lanes.map((l) => (
          <button
            key={l.tech}
            type="button"
            className={l.note ? "ed-file ed-file-off" : "ed-file"}
            data-tech={l.tech}
            data-lane={l.tech}
            data-preview={l.preview ?? ""}
            data-missing={l.note ? "1" : undefined}
          >
            <TechLabel tech={l.tech} label={l.label} />
          </button>
        ))}
      </div>
      <div className="ed-main">
        {lanes.map((l) => (
          <div key={l.tech} className={l === entry ? "ed-tabs ed-tabs-first" : "ed-tabs"} data-tabs-lane={l.tech}>
            {l.note ? (
              <div className="ed-group">
                <button type="button" className="ed-tab" data-art="note">
                  not-compatible.md
                </button>
              </div>
            ) : (
              <>
                {l.preview ? (
                  <div className="ed-group">
                    <button type="button" className="ed-tab" data-art="preview">
                      preview
                    </button>
                  </div>
                ) : null}
                <div className="ed-group">
                  {l.files.map((f) => (
                    <button key={f} type="button" className="ed-tab" data-art={`src-${f}`} data-stem={f.slice(0, f.lastIndexOf("."))}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="ed-group">
                  {GENERATED.map((g) => (
                    <button key={g.art} type="button" className="ed-tab ed-gen" data-art={g.art}>
                      {g.file}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {/* With JS off the preview <img> never gets a src, so the frame falls back to the entry file. */}
        <iframe className="ed-frame" title={`${caseId} source`} src={src(caseId, entry?.tech ?? "", "src-index.tsx")} loading="lazy" />
        <img className="ed-shot" alt="rendered preview" loading="lazy" />
        {lanes
          .filter((l) => l.note)
          .map((l) => (
            <div key={l.tech} className="ed-note" data-note-lane={l.tech}>
              <Note text={l.note!} caseIds={caseIds} />
            </div>
          ))}
      </div>
    </div>
  );
}
