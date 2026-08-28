// Code-asset compile step (called by report.tsx — still no new top-level script).
// For every cell it emits one standalone, self-contained HTML file per tab into
// assets/code/<case>__<tech>__<art>.html:
//   - every authored source file VERBATIM (benchmarked source === displayed source),
//   - the generated HTML and generated CSS, Prettier-formatted for READING only.
// Sizes (and the CSS stats) are measured on the RAW emitted bytes BEFORE formatting, so
// the numbers reflect the real wire output, not the prettified display.
//
// The report references these via an <iframe> (one per case, src swapped on click), which
// keeps BENCHMARK.html small and loads each file lazily from file:// without CORS.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import prettier from "prettier";
import type { Highlight, Lang } from "./shiki.ts";
import { SOURCE_EXT, type Snapshot, type TechInfo } from "./types.ts";

// One entry per tab the editor can open, in row order: the authored files (index.tsx
// first), then the generated pair. `art` is the asset-name suffix and the editor's
// data-art; authored files use `src-<filename>` so `tokens.stylex.ts` and `output.css`
// can never collide.
interface Art {
  art: string;
  file: string;
  lang: Lang;
  raw: string;
  generated: boolean;
}

const artsFor = (snap: Snapshot): Art[] => [
  ...snap.files.map((f) => ({
    art: `src-${f.name}`,
    file: f.name,
    lang: SOURCE_EXT[f.name.slice(f.name.lastIndexOf(".")) as keyof typeof SOURCE_EXT],
    raw: f.code,
    generated: false,
  })),
  { art: "html", file: "output.html", lang: "html" as Lang, raw: snap.html, generated: true },
  { art: "css", file: "output.css", lang: "css" as Lang, raw: snap.css || "/* none */", generated: true },
];

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10_240 ? 1 : 0)} KB`);

// Distinct class selectors in the sheet → count + shortest/longest by name length. The
// extractor is tolerant (handles CSS escapes, skips numeric `.5rem`-style tokens); it's
// a stat, not a parser, so an odd edge is acceptable.
function cssStats(css: string) {
  const classes = new Set<string>();
  const re = /\.((?:\\.|[A-Za-z_-])(?:\\.|[\w-])*)/g;
  for (let m = re.exec(css); m; m = re.exec(css)) classes.add(m[1].replace(/\\(.)/g, "$1"));
  const names = [...classes].sort((a, b) => a.length - b.length || a.localeCompare(b));
  return { count: names.length, shortest: names[0] ?? "", longest: names[names.length - 1] ?? "" };
}

// Format the generated artifacts for display; authored files are returned verbatim (invariant).
async function format(code: string, art: Art): Promise<string> {
  if (!art.generated || !code.trim()) return code;
  try {
    const out = await prettier.format(code, { parser: art.lang === "html" ? "html" : "css", printWidth: 100, htmlWhitespaceSensitivity: "ignore" });
    return out.trimEnd();
  } catch {
    return code; // an un-formattable sheet still displays as the raw emitted bytes
  }
}

// Count rendered DOM elements in the generated markup — opening tags only (`<li …>`,
// not `</li>` or `<!-- -->`). A cheap fairness signal: a lane wrapping every instance in
// extra divs shows a higher count here than one emitting bare nodes.
const domCount = (html: string) => (html.match(/<[a-zA-Z][^>]*>/g) ?? []).length;

// Left: this file's own name and sizes. Right: the total for the GROUP it belongs to, so
// the case's authored weight stays visible while reading any one file, and switching to a
// generated tab swaps the total to the generated pair. Raw bytes only — summing per-file
// gzip overstates what one archive would cost, and each file's own gz is already on the left.
function statusBar(art: Art, arts: Art[]): string {
  const parts = [art.file, `${fmtBytes(Buffer.byteLength(art.raw))} raw`, `${fmtBytes(gzipSync(art.raw).length)} gz`];
  if (art.art === "html") {
    const n = domCount(art.raw);
    parts.push(`${n} ${n === 1 ? "element" : "elements"}`);
  } else if (art.art === "css") {
    const s = cssStats(art.raw);
    parts.push(`${s.count} ${s.count === 1 ? "class" : "classes"}`);
    if (s.shortest) parts.push(`shortest .${s.shortest} (${s.shortest.length})`);
    if (s.longest) parts.push(`longest .${s.longest} (${s.longest.length})`);
  }
  const group = arts.filter((a) => a.generated === art.generated);
  const total = group.reduce((n, a) => n + Buffer.byteLength(a.raw), 0);
  const label = `${group.length} ${art.generated ? "output" : "input"} file${group.length === 1 ? "" : "s"} total: ${fmtBytes(total)} raw`;
  return (
    `<div class="sb">${parts.map((p) => `<span>${escapeHtml(p)}</span>`).join("")}` +
    `<span class="sb-total">${escapeHtml(label)}</span></div>`
  );
}

// Self-contained iframe doc: Shiki's inline-styled <pre> + a sticky status bar + a
// gutter of line numbers (CSS counters over Shiki's per-line spans). Zero external deps.
const DOC_CSS = `:root{color-scheme:dark}
html,body{margin:0;background:#0d1117}
body{font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e6edf3}
.sb{position:sticky;top:0;display:flex;flex-wrap:wrap;gap:6px 16px;padding:7px 16px;background:#161b22;border-bottom:1px solid #21262d;color:#8b949e;font-size:11.5px;z-index:1}
.sb span{white-space:nowrap}.sb span:first-child{color:#c9d1d9}
.sb .sb-total{margin-left:auto;color:#6e7681}
pre.shiki{margin:0;padding:12px 0;background:#0d1117 !important;overflow:auto}
pre.shiki code{counter-reset:line}
.line{counter-increment:line}
.line::before{content:counter(line);display:inline-block;width:3.5ch;margin:0 18px 0 16px;color:#6e7681;text-align:right;user-select:none}`;

/** Emit assets/code/<case>__<tech>__<art>.html for every snapshot cell. */
export async function compileCodeAssets(snaps: Record<string, Snapshot>, techs: Record<string, TechInfo>, hl: Highlight, outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const [cell, snap] of Object.entries(snaps)) {
    const [caseId, tech] = cell.split("/");
    if (!techs[tech]) continue;
    const arts = artsFor(snap);
    for (const art of arts) {
      const code = await format(art.raw, art);
      const doc =
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head>` +
        `<body>${statusBar(art, arts)}${hl(code, art.lang)}</body></html>`;
      writeFileSync(join(outDir, `${caseId}__${tech}__${art.art}.html`), doc);
    }
  }
}
