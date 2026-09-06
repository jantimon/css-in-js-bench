import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import type { SsrModule } from "../report/types.ts";

type ManifestEntry = { file: string; isEntry?: boolean; imports?: string[]; css?: string[] };
type Manifest = Record<string, ManifestEntry>;

const MIME: Record<string, string> = {
  ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".map": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".avif": "image/avif", ".woff": "font/woff", ".woff2": "font/woff2",
};
const escapeAttribute = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

/** Serve the production asset graph for timing, profiles, screenshots and checks. */
export async function serveBrowserFixture({ directory, ssrMod }: { directory: string; ssrMod: SsrModule }) {
  const root = resolve(directory);
  const assetPath = (name: string) => {
    const path = resolve(root, name);
    if (!path.startsWith(root + sep)) throw new Error(`Invalid browser asset: ${name}`);
    return path;
  };
  const manifest: Manifest = JSON.parse(readFileSync(assetPath(".vite/manifest.json"), "utf8"));
  const entry = Object.values(manifest).find((item) => item.isEntry && item.file === "entry.js");
  if (!entry) throw new Error("Browser build manifest has no entry.js entry");
  const styles = new Set<string>();
  const visited = new Set<ManifestEntry>();
  const collect = (item: ManifestEntry) => {
    if (visited.has(item)) return;
    visited.add(item);
    for (const key of item.imports ?? []) {
      if (!manifest[key]) throw new Error(`Missing browser manifest import: ${key}`);
      collect(manifest[key]);
    }
    for (const css of item.css ?? []) styles.add(css);
    if (!statSync(assetPath(item.file)).isFile()) throw new Error(`Missing browser asset: ${item.file}`);
  };
  collect(entry);
  // This manifest is present even when a lane has no case-specific sheets.
  const caseStyles: { cases: Record<string, string[]>; maxInput?: Record<string, number> } = JSON.parse(readFileSync(assetPath("browser-styles.json"), "utf8"));
  for (const css of [...styles, ...Object.values(caseStyles.cases).flat()]) {
    if (!statSync(assetPath(css)).isFile()) throw new Error(`Missing browser stylesheet: ${css}`);
  }
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://fixture");
      if (url.pathname !== "/") {
        const name = decodeURIComponent(url.pathname.slice(1));
        const path = assetPath(name);
        if (!statSync(path).isFile()) throw new Error("Asset is not a file");
        res.setHeader("content-type", MIME[extname(path)] ?? "application/octet-stream");
        res.end(readFileSync(path));
        return;
      }
      const caseId = url.searchParams.get("case") ?? "";
      const n = Number(url.searchParams.get("n") ?? "1");
      if (!caseId || !Number.isSafeInteger(n) || n < 1) {
        res.writeHead(400).end("A case and a positive integer n are required");
        return;
      }
      if (!(caseId in caseStyles.cases)) throw new Error(`Browser build has no case: ${caseId}`);
      const maxInput = caseStyles.maxInput?.[caseId];
      if (maxInput !== undefined && n > maxInput) throw new Error(`Browser CSS supports ${caseId} inputs up to ${maxInput}; rebuild for n=${n}`);
      const css = [...new Set([...styles, ...caseStyles.cases[caseId]])];
      const links = css.map((file) => `<link rel="stylesheet" href="/${escapeAttribute(file)}">`).join("");
      const rendered = url.searchParams.get("mount") === "1" ? { html: "", head: "" } : ssrMod.renderCase(caseId, n);
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,">${links}${rendered.head ?? ""}</head><body><div id="root">${rendered.html}</div><script type="module" src="/${escapeAttribute(entry.file)}"></script></body></html>`);
    } catch (error) {
      res.writeHead(req.url?.startsWith("/?") ? 500 : 404).end(String(error));
    }
  });
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const port = (server.address() as { port: number }).port;
  return { port, close: () => new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done())) };
}
