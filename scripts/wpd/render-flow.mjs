// wpd driver module for the `render-timing` measurement. wpd loads the host page (--url) at
// the right mode, then calls this. WPD_FLOW selects the phase; gen uses mount.
//
//   mount   : url has ?mount=1   → window.__mount() cold-renders the workload into an empty root
//   hydrate : url has ?manual=1  → window.__hydrate() commits the deferred hydration
//   inp     : url auto-hydrates  → reset, then change each input from i to i + 1
//
// Only the measureStep() body is timed; wpd waits --settle after it to flush paints. wpd requires
// this module to live inside its working directory (gen runs wpd with cwd = repo root).
const FLOW = process.env.WPD_FLOW || "mount";

export async function run({ page, measureStep }) {
  if (FLOW === "mount") {
    await page.waitForFunction(() => typeof window.__mount === "function", { timeout: 30000 });
    // The in-page performance.now() delta around __mount() is the SAME quantity gen measures
    // (and what real-user timing sees); wpd's reported step wallMs is timed node-side around this
    // page.evaluate, so it additionally carries the CDP round-trip + settle. Capturing both here
    // (gated on WPD_INPAGE_LOG) quantifies that offset. No-op on normal runs.
    await measureStep("mount", () =>
      page.evaluate(() => {
        const t0 = performance.now();
        window.__mount();
        window.__inPageMountMs = performance.now() - t0;
      }),
    );
    if (process.env.WPD_INPAGE_LOG) {
      const inPageMs = await page.evaluate(() => window.__inPageMountMs);
      const { appendFileSync } = await import("node:fs");
      appendFileSync(process.env.WPD_INPAGE_LOG, JSON.stringify({ url: page.url(), inPageMs }) + "\n");
    }
    return;
  }
  if (FLOW === "hydrate") {
    await page.waitForFunction(() => typeof window.__hydrate === "function", { timeout: 30000 });
    await measureStep("hydrate", () => page.evaluate(() => window.__hydrate()));
    return;
  }
  if (FLOW === "inp") {
    await page.waitForFunction(
      () => window.__hydrateMs !== undefined && typeof window.__prepareInp === "function" && typeof window.__inp === "function",
      { timeout: 30000 },
    );
    for (let i = 0; i < 3; i++) await page.evaluate(async () => {
      await window.__prepareInp();
      await window.__inp();
    });
    await page.evaluate(() => window.__prepareInp());
    await measureStep("inp", () => page.evaluate(() => window.__inp()));
    return;
  }
  throw new Error(`render-flow: unknown WPD_FLOW ${FLOW}`);
}
