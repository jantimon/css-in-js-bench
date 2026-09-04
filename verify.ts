// verify — the parity GATE (run automatically at the end of every gen, and standalone
// via `pnpm verify`). The whole benchmark rests on one invariant: for a given case,
// EVERY tech renders the SAME thing — same DOM, same pixels — and only the styling
// runtime differs. If a lane's build is broken (an extra wrapper div, a leaked prop, an
// under-styled component) its numbers are meaningless. verify proves the invariant holds
// instead of trusting it.
//
// It checks four things, escalating from cheap+always to heavy+optional:
//   1. DOM ATTRIBUTE HYGIENE  (static) — every element's attributes are on a whitelist,
//      so a transient `$prop` or any framework-leaked attribute fails loudly.
//   2. DOM PARITY ACROSS TECHS (static) — for each case, all techs share one element
//      count AND one tag skeleton (the structure, ignoring class/id/style values).
//   3. PIXEL PARITY ACROSS TECHS (browser) — each tech's screenshot matches the case's
//      reference pixel-for-pixel (writes a red diff PNG on mismatch). Needs result/assets.
//   4. SSR↔HYDRATE PARITY (browser) — the hydrate client build re-renders the SSR markup
//      with no hydration mismatch and the same element count, proving the microbench/
//      autocannon (SSR) path and the hydrate path measure the same render. Needs dist/.
//
// 1–2 read only result/snapshot.json (always present after any gen:samples). 3–4 reuse the
// artifacts a full gen:samples already produced (screenshots / per-tech dist) and are SKIPPED, never
// rebuilt, when absent — so a quick `pnpm gen:samples` gets a fast static verify and a full run
// gets the works. verify never builds and never writes result/ data; it writes only its
// own report (result/verify.json + result/verify/*.png diffs) and exits non-zero on any
// violation.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { chromium, type Browser, type Page } from "@playwright/test";
import benchConfig from "./bench.config.ts";
import type { Snapshot, SsrModule } from "./report/types.ts";
import { validateWpdResults } from "./report/wpd-results.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TECHS_DIR = join(ROOT, "techs");
const RESULT_DIR = join(ROOT, "result");
const VERIFY_DIR = join(RESULT_DIR, "verify");

// The ONLY attributes a faithful render should put on the DOM: the styling hooks
// (class/id/style) plus the genuinely-functional HTML/SVG/ARIA attributes the cases
// actually use. Anything else — most importantly a `$`-prefixed transient prop that a
// runtime forgot to strip — is a fidelity bug. Seeded from the attributes present today;
// extend it consciously when a NEW legitimate attribute appears (that's the point: a
// surprise attribute should fail the gate, not slip through).
const ALLOWED_ATTRS = new Set([
  "class", "id", "style", // styling hooks — the only ones that should be common
  "disabled", "type", "tabindex", "role", "name", "value", "href", // functional HTML
  "viewbox", "fill", "d", "focusable", "width", "height", "xmlns", // SVG (names compared lowercased)
]);
const allowedFamily = (a: string) => a.startsWith("aria-") || a.startsWith("data-");

interface Element { tag: string; attrs: string[] }

// A tolerant tokenizer (a stat, not a spec parser): pull every OPENING tag — `<div ...>`,
// `<path .../>` — with its attribute names, in document order. `</div>` (starts with `/`),
// comments and `<!doctype` (start with `!`) are skipped by the leading `[a-zA-Z]` anchor.
function parseElements(html: string): Element[] {
  const els: Element[] = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
    const attrs: string[] = [];
    const aRe = /([:a-zA-Z_][\w:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
    for (let a = aRe.exec(m[2]); a; a = aRe.exec(m[2])) attrs.push(a[1]);
    els.push({ tag: m[1].toLowerCase(), attrs });
  }
  return els;
}

interface Violation { kind: string; detail: string }

// (1) attribute hygiene over one cell's elements.
function attrViolations(els: Element[]): Violation[] {
  const out: Violation[] = [];
  for (const el of els)
    for (const a of el.attrs) {
      const low = a.toLowerCase();
      if (ALLOWED_ATTRS.has(low) || allowedFamily(low)) continue;
      out.push({ kind: a[0] === "$" ? "transient-prop-leak" : "unexpected-attr", detail: `<${el.tag} ${a}>` });
    }
  // de-dup identical leaks (every instance repeats them) → one line per distinct (tag,attr).
  const seen = new Set<string>();
  return out.filter((v) => (seen.has(v.detail) ? false : seen.add(v.detail) && true));
}

// ---- static phase (always) ------------------------------------------------------
interface CaseReport { caseId: string; ok: boolean; notes: string[] }

function staticChecks(snaps: Record<string, Snapshot>): { reports: CaseReport[]; failed: boolean } {
  // group cells by case → { tech: elements }
  const byCase: Record<string, Record<string, Element[]>> = {};
  for (const [cell, snap] of Object.entries(snaps)) {
    const [caseId, tech] = cell.split("/");
    (byCase[caseId] ??= {})[tech] = parseElements(snap.html);
  }
  const reports: CaseReport[] = [];
  let failed = false;
  for (const caseId of Object.keys(byCase).sort()) {
    const techs = byCase[caseId];
    const notes: string[] = [];
    let ok = true;

    // attribute hygiene, per tech
    for (const tech of Object.keys(techs).sort()) {
      const vs = attrViolations(techs[tech]);
      if (vs.length) {
        ok = false;
        notes.push(`✗ ${tech}: ${vs.map((v) => `${v.kind} ${v.detail}`).join(", ")}`);
      }
    }

    // DOM parity: element count + tag skeleton must agree across techs. The reference is
    // the MODE skeleton (most techs agree) so even a wrong baseline is caught as the outlier.
    const skeletons = Object.fromEntries(Object.entries(techs).map(([t, els]) => [t, els.map((e) => e.tag).join(">")]));
    const tally = new Map<string, string[]>();
    for (const [t, sk] of Object.entries(skeletons)) (tally.get(sk) ?? tally.set(sk, []).get(sk)!).push(t);
    const ref = [...tally.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const refCount = ref[0] ? ref[0].split(">").length : 0;
    for (const [sk, ts] of tally) {
      if (sk === ref[0]) continue;
      ok = false;
      const n = sk ? sk.split(">").length : 0;
      notes.push(`✗ ${ts.join(", ")}: DOM differs — ${n} elements vs reference ${refCount} (tags don't match ${ref[1].join("/")})`);
    }
    if (ok) notes.push(`✓ ${Object.keys(techs).length} techs · ${refCount} elements · attrs clean`);
    if (!ok) failed = true;
    reports.push({ caseId, ok, notes });
  }
  return { reports, failed };
}

// ---- pixel parity across techs (browser) ----------------------------------------
const MIME: Record<string, string> = { ".avif": "image/avif", ".png": "image/png" };
const dataUrl = (file: string) => `data:${MIME[extname(file)] ?? "image/png"};base64,${readFileSync(file).toString("base64")}`;

// Compare two screenshots pixel-by-pixel inside the page (canvas getImageData) — no native image
// deps. Different dimensions are NOT a separate hard-fail: both images are drawn top-left
// onto a common max(w)×max(h) canvas (the area only one image covers stays transparent and
// counts as differing), so a size delta folds into the SAME ratio. A 2px rounding drift is
// then a sub-1% ratio (pass); a collapsed image or wrong border is double digits (fail).
async function pixelDiff(page: Page, aUrl: string, bUrl: string, thr = 16) {
  return page.evaluate(
    async ([a, b, t]: [string, string, number]) => {
      const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const W = Math.max(ia.width, ib.width), H = Math.max(ia.height, ib.height);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d")!;
      const dataOf = (im: HTMLImageElement) => { ctx.clearRect(0, 0, W, H); ctx.drawImage(im, 0, 0); return ctx.getImageData(0, 0, W, H).data; };
      const da = dataOf(ia), db = dataOf(ib);
      const out = ctx.createImageData(W, H);
      let diff = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        if (d > t) { diff++; out.data[i] = 255; out.data[i + 3] = 255; }
        else { out.data[i] = da[i]; out.data[i + 1] = da[i + 1]; out.data[i + 2] = da[i + 2]; out.data[i + 3] = 60; }
      }
      ctx.putImageData(out, 0, 0);
      const dims = ia.width !== ib.width || ia.height !== ib.height ? ` (${ib.width}×${ib.height} vs ${ia.width}×${ia.height})` : "";
      return { ratio: diff / (W * H), diffUrl: c.toDataURL("image/png"), dims };
    },
    [aUrl, bUrl, thr] as [string, string, number],
  );
}

const PIXEL_EPS = 0.01; // ≤1% differing pixels tolerated — absorbs sub-pixel AA/rounding so
// only substantive visual breaks fail (a faithful lane renders ~0; a broken one, double digits).

// tsx/esbuild compiles this file with `keepNames`, wrapping inner functions in a `__name`
// helper that only exists at module scope. Playwright serializes just the evaluate callback
// (not that helper), so the browser would hit `__name is not defined`. Seed a no-op shim via
// a STRING evaluate (a string literal esbuild leaves untouched) before any function evaluate.
const installNameShim = (page: Page) => page.evaluate("globalThis.__name ??= (f) => f");

async function pixelChecks(page: Page, assets: Record<string, string[]>, reports: CaseReport[]): Promise<boolean> {
  await installNameShim(page);
  // group screenshot paths by case
  const byCase: Record<string, Record<string, string>> = {};
  for (const [cell, paths] of Object.entries(assets)) {
    const [caseId, tech] = cell.split("/");
    const p = join(RESULT_DIR, paths[0]);
    if (existsSync(p)) (byCase[caseId] ??= {})[tech] = p;
  }
  let failed = false;
  for (const [caseId, techs] of Object.entries(byCase)) {
    const names = Object.keys(techs);
    if (names.length < 2) continue;
    // styled-components is the canonical author of the shared template; every other lane
    // (incl. the hand-written vanilla) derives from it — so it's the authoritative pixel
    // reference. Fall back to vanilla, then alphabetical.
    const refTech = names.includes("styled-components") ? "styled-components" : names.includes("vanilla") ? "vanilla" : names.sort()[0];
    let refUrl = ""; // base64 of a 1500px-wide image — only paid for once a lane actually differs
    const report = reports.find((r) => r.caseId === caseId) ?? (reports.push({ caseId, ok: true, notes: [] }), reports[reports.length - 1]);
    for (const tech of names.sort()) {
      if (tech === refTech) continue;
      // Screenshots are content-addressed, so lanes that render identically share one file.
      // Same path means same bytes means same pixels — nothing for the browser to decide.
      if (techs[tech] === techs[refTech]) continue;
      refUrl ||= dataUrl(techs[refTech]);
      const res = await pixelDiff(page, refUrl, dataUrl(techs[tech]));
      if (res.ratio > PIXEL_EPS) {
        report.ok = false; failed = true;
        const out = join(VERIFY_DIR, `${caseId}__${tech}__diff.png`);
        writeFileSync(out, Buffer.from(res.diffUrl.split(",")[1], "base64"));
        report.notes.push(`✗ pixels ${tech}: ${(res.ratio * 100).toFixed(2)}% differ from ${refTech}${res.dims} → verify/${caseId}__${tech}__diff.png`);
      }
    }
    if (report.ok) report.notes.push(`✓ pixels: ${names.length} techs match ${refTech}`);
  }
  return failed;
}

// ---- SSR↔hydrate parity (browser, reuses dist) ----------------------------------
// For each tech that has BOTH a microbench SSR build and a hydrate client build on disk,
// serve the SSR markup + the client bundle, hydrate in a real browser, and assert: no
// hydration-mismatch console error, and the post-hydration element count equals the SSR
// count. That ties the SSR-measured path (microbench/autocannon) to the hydrate path.
async function hydrateChecks(browser: Browser, techs: string[], cases: string[], reports: CaseReport[]): Promise<boolean> {
  const n = benchConfig.snapshotN;
  let failed = false;
  for (const tech of techs) {
    const ssrPath = join(TECHS_DIR, tech, "dist", "microbench", "entry.mjs");
    const bundlePath = join(TECHS_DIR, tech, "dist", "hydrate", "entry.js");
    if (!existsSync(ssrPath) || !existsSync(bundlePath)) continue;
    let mod: SsrModule;
    try {
      mod = (await import(pathToFileURL(ssrPath).href + `?t=${Date.now()}`)) as SsrModule;
    } catch { continue; }
    const bundleJs = readFileSync(bundlePath);
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://x");
      if (url.pathname === "/entry.js") { res.setHeader("content-type", "text/javascript"); return res.end(bundleJs); }
      const caseId = url.searchParams.get("case") ?? "";
      res.setHeader("content-type", "text/html");
      res.end(`<!doctype html><meta charset=utf-8><div id="root">${mod.renderCase(caseId, n).html}</div><script type="module" src="/entry.js"></script>`);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as { port: number }).port;
    try {
      for (const caseId of cases) {
        if (!existsSync(join(TECHS_DIR, tech, "case", caseId, "index.tsx"))) continue;
        const report = reports.find((r) => r.caseId === caseId)!;
        const ssrCount = parseElements(mod.renderCase(caseId, n).html).length;
        const page = await browser.newPage();
        const errors: string[] = [];
        page.on("console", (m) => { if (m.type() === "error" && /hydrat|did not match|mismatch/i.test(m.text())) errors.push(m.text()); });
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(`http://127.0.0.1:${port}/?case=${caseId}&n=${n}`, { waitUntil: "load" });
        try { await page.waitForFunction(() => window.__hydrateMs !== undefined, null, { timeout: 15_000 }); } catch {}
        const liveCount = await page.evaluate(() => document.getElementById("root")!.querySelectorAll("*").length);
        await page.close();
        if (errors.length) {
          report.ok = false; failed = true;
          report.notes.push(`✗ hydrate ${tech}: hydration mismatch — ${errors[0].slice(0, 120)}`);
        } else if (liveCount !== ssrCount) {
          report.ok = false; failed = true;
          report.notes.push(`✗ hydrate ${tech}: post-hydration ${liveCount} elements ≠ SSR ${ssrCount}`);
        }
      }
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  }
  return failed;
}

// ---- orchestration --------------------------------------------------------------
export interface VerifyResult { ok: boolean; reports: CaseReport[] }

export async function verify({ quiet = false }: { quiet?: boolean } = {}): Promise<VerifyResult> {
  const snapPath = join(RESULT_DIR, "snapshot.json");
  if (!existsSync(snapPath)) {
    if (!quiet) console.error("verify: no result/snapshot.json — run `pnpm gen:samples` first.");
    return { ok: false, reports: [] };
  }
  const snaps: Record<string, Snapshot> = JSON.parse(readFileSync(snapPath, "utf8"));
  try {
    validateWpdResults(RESULT_DIR);
  } catch (error) {
    if (!quiet) console.error(`verify: ${(error as Error).message}`);
    return { ok: false, reports: [] };
  }
  rmSync(VERIFY_DIR, { recursive: true, force: true });
  mkdirSync(VERIFY_DIR, { recursive: true });

  const { reports, failed: staticFailed } = staticChecks(snaps);
  let visualFailed = false;

  const assetsFile = join(RESULT_DIR, "measurement-screenshots.json");
  const hasAssets = existsSync(assetsFile);
  const techs = [...new Set(Object.keys(snaps).map((k) => k.split("/")[1]))].sort();
  const cases = [...new Set(Object.keys(snaps).map((k) => k.split("/")[0]))].sort();
  const anyDist = techs.some((t) => existsSync(join(TECHS_DIR, t, "dist", "hydrate", "entry.js")));

  if (hasAssets || anyDist) {
    const browser = await chromium.launch();
    try {
      if (hasAssets) {
        const page = await browser.newPage();
        const assets: Record<string, string[]> = JSON.parse(readFileSync(assetsFile, "utf8"));
        visualFailed = (await pixelChecks(page, assets, reports)) || visualFailed;
        await page.close();
      } else if (!quiet) console.log("verify: no screenshots — skipping pixel parity (run `gen --measure=screenshots`).");
      if (anyDist) visualFailed = (await hydrateChecks(browser, techs, cases, reports)) || visualFailed;
      else if (!quiet) console.log("verify: no hydrate builds — skipping SSR↔hydrate parity (run `gen --measure=hydrate`).");
    } finally {
      await browser.close();
    }
  }

  const ok = !staticFailed && !visualFailed;
  writeFileSync(join(RESULT_DIR, "verify.json"), JSON.stringify({ ok, generatedAt: new Date().toISOString(), reports }, null, 2) + "\n");

  if (!quiet) {
    console.log(`\nverify — DOM + pixel parity across ${techs.length} techs · ${cases.length} cases`);
    for (const r of reports) {
      console.log(`\n${r.ok ? "✓" : "✗"} ${r.caseId}`);
      for (const note of r.notes) console.log(`    ${note}`);
    }
    console.log(`\n${ok ? "✓ verify passed — all lanes render identically" : "✗ verify FAILED — see violations above + result/verify/*.png"}`);
  }
  return { ok, reports };
}

// CLI: `node ./verify.ts` (also imported by gen:samples at the end of a run).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  verify().then((r) => process.exit(r.ok ? 0 : 1));
}
