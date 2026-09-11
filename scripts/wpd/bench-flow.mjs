// wpd --bench module for the client breakdown lanes. It runs INSIDE the page (live
// document/window, no page handle, no `process`) against the shared hydrate server loaded via
// --url, and triggers exactly one client phase. The phase rides the URL as `?phase=` (env vars do
// not cross into the page under --bench):
//
//   mount   : url has ?mount=1  -> window.__mount() cold-renders into an empty root
//   hydrate : url has ?manual=1 -> window.__hydrate() commits the deferred hydration
//   inp     : url auto-hydrates -> reset, then change each instance's input from i to i + 1
//
// The client-entry's own measure ends at commit / inside rAF, which can be BEFORE the browser
// performs style/layout/paint for that frame. This wrapper adds a `${phase}:frame` measure through
// the following painted frame, so WPD's breakdown really contains the rendering work we compare.
//
// mount/hydrate are single-shot (a second createRoot/hydrateRoot on the same page would double
// mount), so those run with --iterations 1. inp repeats one warm transition in place.
const PHASE = new URLSearchParams(location.search).get("phase") || "mount";

const waitFor = async (predicate, label) => {
  const deadline = Date.now() + 30000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`bench-flow: timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const measureThroughPaint = async (phase, action, extraFrames) => {
  const label = `${phase}:frame`;
  performance.mark(`${label}:start`);
  await action();
  for (let i = 0; i < extraFrames; i++) await nextFrame();
  performance.mark(`${label}:end`);
  performance.measure(label, `${label}:start`, `${label}:end`);
};

export async function prepare() {
  if (PHASE === "inp") {
    await waitFor(() => window.__hydrateMs !== undefined && typeof window.__prepareInp === "function" && typeof window.__inp === "function", "interaction hooks");
    for (let i = 0; i < 3; i++) {
      await window.__prepareInp();
      await window.__inp();
    }
  }
}

export async function run() {
  if (PHASE === "mount") {
    await waitFor(() => typeof window.__mount === "function", "__mount");
    await measureThroughPaint("mount", async () => {
      window.__mount();
      await waitFor(() => window.__mountMs !== undefined, "__mountMs");
    }, 2);
    return;
  }
  if (PHASE === "hydrate") {
    await waitFor(() => typeof window.__hydrate === "function", "__hydrate");
    await measureThroughPaint("hydrate", async () => {
      window.__hydrate();
      await waitFor(() => window.__hydrateMs !== undefined, "__hydrateMs");
    }, 2);
    return;
  }
  if (PHASE === "inp") {
    // Reset is outside inp:frame. The outer run includes setup and is not an
    // interaction duration; gen-wpd reports only the named action span here.
    await window.__prepareInp();
    // __inp resolves inside the first rAF callback (before that frame paints); the additional rAF
    // makes the wrapper include its rendering work.
    await measureThroughPaint("inp", () => window.__inp(), 1);
    return;
  }
  throw new Error(`bench-flow: unknown WPD_PHASE ${PHASE}`);
}
