// wpd --target node entry for the SSR lane. gen-wpd points WPD_SSR_MODULE at a tech's built
// microbench bundle (dist/microbench/entry.mjs, which inlines react-dom + the styling lib with a
// sourcemap), and WPD_CASE / WPD_N select the workload. wpd imports this module in-process and
// profiles run() with node's inspector; per-iteration timing + per-package self-time come from wpd,
// so no hand-rolled Session/Profiler plumbing here.
const mod = await import(process.env.WPD_SSR_MODULE);
const render = mod.renderHtml ?? ((caseId, n) => mod.renderCase(caseId, n).html);
const caseId = process.env.WPD_CASE;
const n = Number(process.env.WPD_N ?? "1");

export function run() {
  render(caseId, n);
}
