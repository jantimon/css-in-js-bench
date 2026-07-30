// Generate a --bench module per lane that injects that lane's SSR markup+CSS and
// forces a style-recalc + layout flush. DOM is identical across lanes (repo's
// verify guarantees it); CSS differs, so the browser style/layout cost isolates
// the emitted-CSS strategy. run() re-applies innerHTML + <style> each iteration.
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const lanes = process.argv.slice(2);
const caseId = "realistic-button";
const n = 1000;
mkdirSync(".wpd-runs/inject", { recursive: true });

for (const lane of lanes) {
  const entry = await import(pathToFileURL(resolve("techs", lane, "dist/microbench/entry.mjs")).href);
  const { html, css } = entry.renderCase(caseId, n);
  const mod = `// AUTO-GENERATED browser inject probe for lane "${lane}" (${caseId}, n=${n}).
const HTML = ${JSON.stringify(html)};
const CSS = ${JSON.stringify(css)};
export function prepare() {
  const style = document.createElement("style");
  style.id = "lane-css";
  style.textContent = CSS;
  document.head.appendChild(style);
}
export function run() {
  document.body.innerHTML = HTML;   // parse + attach 1000 instances
  void document.body.offsetHeight;  // force style recalc + layout flush
}
`;
  writeFileSync(`.wpd-runs/inject/${lane}.mjs`, mod);
  console.log(`${lane}: html ${(html.length/1024).toFixed(0)}KB · css ${(css.length/1024).toFixed(1)}KB`);
}
