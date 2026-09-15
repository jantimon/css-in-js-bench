import assert from "node:assert/strict";
import type { Browser, Page } from "@playwright/test";
import benchConfig from "../bench.config.ts";
import type { SsrModule } from "../report/types.ts";

const TIMEOUT = 30_000;
const browserOptions = {
  viewport: { width: benchConfig.browser.width, height: benchConfig.browser.height },
  deviceScaleFactor: benchConfig.browser.deviceScaleFactor,
};

async function settle(page: Page): Promise<void> {
  await page.evaluate(async (timeout) => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      await Promise.race([
        (async () => {
          await document.fonts.ready;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const animations = document.getElementById("root")!.getAnimations({ subtree: true });
          await Promise.all(animations
            .filter((animation) => animation.playState !== "paused" && Number.isFinite(animation.effect?.getComputedTiming().endTime))
            .map((animation) => animation.finished.catch(() => {})));
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Browser fixture did not settle")), timeout); }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }, TIMEOUT);
}

// Compare the rendered workload, allowing each framework its own class names and
// hydration markers. Fixed dot dimensions also catch missing dynamic-case CSS.
async function readInstances(page: Page, caseId: string) {
  return page.evaluate((caseId) => {
    const properties = [
      "display", "position", "box-sizing", "color", "background-color",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-top-color", "border-radius",
      "font-family", "font-size", "font-weight", "line-height", "letter-spacing",
      "text-align", "text-decoration-line", "opacity", "transform", "box-shadow",
      "gap", "align-items", "justify-content", "flex-direction",
    ];
    if (caseId.startsWith("dyn-")) properties.push("width", "height");
    const isWorkload = (element: Element) => !["STYLE", "SCRIPT", "LINK"].includes(element.tagName);
    const read = (element: Element): unknown => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        text: [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(""),
        styles: Object.fromEntries(properties.map((property) => [property, style.getPropertyValue(property)])),
        children: [...element.children].filter(isWorkload).map(read),
      };
    };
    return [...document.getElementById("root")!.children].filter(isWorkload).map(read);
  }, caseId);
}

/** Check real served pages in separate contexts before any timing samples run. */
export async function validateBrowserFixture(
  browser: Browser,
  { port, ssrMod, caseId, n = 3 }: { port: number; ssrMod: SsrModule; caseId: string; n?: number },
): Promise<void> {
  assert.ok(Number.isInteger(n) && n > 0, "Browser validation requires a positive instance count");
  const contexts = [];
  const failures: string[] = [];
  const watch = (page: Page) => {
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" || /hydrat|server.rendered|did not match/i.test(message.text())) failures.push(message.text());
    });
    page.on("requestfailed", (request) => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
  };
  const healthy = (phase: string) => assert.deepEqual(failures, [], `${caseId}: ${phase} browser errors`);
  const url = `http://127.0.0.1:${port}/?case=${encodeURIComponent(caseId)}&n=${n}`;
  try {
    const referenceContext = await browser.newContext({ ...browserOptions, javaScriptEnabled: false });
    contexts.push(referenceContext);
    const reference = await referenceContext.newPage();
    const { html, css } = ssrMod.renderCase(caseId, n + 1);
    // Raw CSS belongs only in this independent expected-output page. The served
    // fixture must load the lane's own production CSS and SSR style metadata.
    await reference.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><div id="root">${html}</div>`);
    // No client code or input change runs in these pages. The load event waits
    // for stylesheets; reading computed styles then forces their application.
    const expected = await readInstances(reference, caseId);
    assert.equal(expected.length, n + 1, `${caseId}: one root element per workload instance`);

    const ssr = await referenceContext.newPage();
    watch(ssr);
    await ssr.goto(`${url}&manual=1`, { waitUntil: "load", timeout: TIMEOUT });
    assert.deepEqual(await readInstances(ssr, caseId), expected.slice(0, n), `${caseId}: styles before client JavaScript`);
    healthy("SSR");

    const hydrateContext = await browser.newContext(browserOptions);
    contexts.push(hydrateContext);
    const hydrated = await hydrateContext.newPage();
    watch(hydrated);
    await hydrated.goto(`${url}&manual=1`, { waitUntil: "load", timeout: TIMEOUT });
    await hydrated.waitForFunction(() => typeof window.__hydrate === "function", null, { timeout: TIMEOUT });
    const originals = await hydrated.evaluateHandle(() => [...document.getElementById("root")!.querySelectorAll("*")].filter((element) => !["STYLE", "SCRIPT", "LINK"].includes(element.tagName)));
    await hydrated.evaluate(() => window.__hydrate!());
    await hydrated.waitForFunction(() => Number.isFinite(window.__hydrateMs), null, { timeout: TIMEOUT });
    await settle(hydrated);
    assert.ok(await hydrated.evaluate((nodes) => {
      const current = [...document.getElementById("root")!.querySelectorAll("*")].filter((element) => !["STYLE", "SCRIPT", "LINK"].includes(element.tagName));
      return current.length === nodes.length && nodes.every((node, i) => node === current[i]);
    }, originals), `${caseId}: hydration must retain SSR workload elements`);
    assert.deepEqual(await readInstances(hydrated, caseId), expected.slice(0, n), `${caseId}: styles after hydration`);
    healthy("hydration");

    await hydrated.waitForFunction(() => typeof window.__prepareInp === "function" && typeof window.__inp === "function", null, { timeout: TIMEOUT });
    await hydrated.evaluate(async () => { await window.__prepareInp!(); await window.__inp!(); });
    await settle(hydrated);
    assert.deepEqual(await readInstances(hydrated, caseId), expected.slice(1), `${caseId}: styles after changed input`);
    healthy("interaction");
    await originals.dispose();

    const mountContext = await browser.newContext(browserOptions);
    contexts.push(mountContext);
    const mounted = await mountContext.newPage();
    watch(mounted);
    await mounted.goto(`${url}&mount=1`, { waitUntil: "load", timeout: TIMEOUT });
    assert.equal(await mounted.locator("#root").evaluate((root) => root.children.length), 0, `${caseId}: cold mount starts empty`);
    await mounted.waitForFunction(() => typeof window.__mount === "function", null, { timeout: TIMEOUT });
    await mounted.evaluate(() => window.__mount!());
    await mounted.waitForFunction(() => Number.isFinite(window.__mountMs), null, { timeout: TIMEOUT });
    await settle(mounted);
    assert.deepEqual(await readInstances(mounted, caseId), expected.slice(0, n), `${caseId}: styles after cold mount`);
    healthy("mount");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
}
