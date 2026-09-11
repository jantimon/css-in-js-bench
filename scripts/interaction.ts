// Every sample changes the same mounted instances from input i to input i + 1.
// Reset and frame settling belong outside both the timer and the profiled action span.
declare global {
  interface Window {
    __prepareInp?: () => Promise<void>;
    __inp?: () => Promise<number>;
  }
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function installInteraction(setOffset: (offset: number) => void): void {
  let prepared = false;

  window.__prepareInp = async () => {
    prepared = false;
    setOffset(0);
    await nextFrame();
    // Finish finite reset transitions before timing the next change. Paused or
    // looping animations do not have a completion point to await.
    const animations = document.getElementById("root")!.getAnimations({ subtree: true });
    await Promise.all(animations
      .filter((animation) => animation.playState !== "paused" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
      .map((animation) => animation.finished.catch(() => {})));
    await nextFrame();
    prepared = true;
  };

  window.__inp = async () => {
    if (!prepared) throw new Error("Interaction requires __prepareInp() before each sample");
    prepared = false;
    const start = performance.now();
    performance.mark("inp:start");
    setOffset(1);
    // This endpoint includes the wait to rAF, which runs before repaint. WPD adds
    // a further frame to its inp:frame span to include browser rendering work.
    await nextFrame();
    const ms = performance.now() - start;
    performance.mark("inp:end");
    performance.measure("inp", "inp:start", "inp:end");
    return ms;
  };
}
