import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { chromium } from "@playwright/test";
import { serveBrowserFixture } from "./browser-fixture.ts";
import { validateBrowserFixture } from "./browser-validation.ts";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.env.NODE_ENV = "production";

async function buildLane(tech, directory) {
  for (const [configName, output] of [["microbench", "ssr"], ["hydrate", "client"]]) {
    let config = (await import(pathToFileURL(join(ROOT, "techs", tech, `vite.${configName}.config.ts`)).href)).default;
    if (typeof config === "function") config = await config();
    await build({ ...config, configFile: false, logLevel: "error", build: { ...config.build, outDir: join(directory, output) } });
  }
  return import(pathToFileURL(join(directory, "ssr", "entry.mjs")).href);
}

function appearance() {
  return [...document.getElementById("root").children].map((element) => {
    const style = getComputedStyle(element);
    return { text: element.textContent, padding: style.padding, background: style.backgroundColor, color: style.color, width: style.width, height: style.height, transform: style.transform };
  });
}

function matchingRules() {
  const elements = [...document.getElementById("root").children];
  const rules = [];
  const collect = (list) => {
    for (const rule of list) {
      if (rule.selectorText && elements.some((element) => element.matches(rule.selectorText))) rules.push(rule.cssText);
      if (rule.cssRules) collect(rule.cssRules);
    }
  };
  for (const sheet of document.styleSheets) collect(sheet.cssRules);
  return rules.sort();
}

test("runtime styles survive SSR, hydration and the first input change", { timeout: 180_000 }, async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const temporary = mkdtempSync(join(tmpdir(), "css-bench-handoff-"));
  for (const tech of ["emotion", "styled-components", "goober"]) await t.test(tech, async (t) => {
    const directory = join(temporary, tech);
    const ssrMod = await buildLane(tech, directory);
    const server = await serveBrowserFixture({ directory: join(directory, "client"), ssrMod });
    t.after(() => server.close());
    if (tech === "emotion") await t.test("reject missing runtime style handoff", async () => {
      const broken = await serveBrowserFixture({
        directory: join(directory, "client"),
        ssrMod: { renderCase: (caseId, n) => { const { html, css } = ssrMod.renderCase(caseId, n); return { html, css }; } },
      });
      try {
        await assert.rejects(validateBrowserFixture(browser, { port: broken.port, ssrMod, caseId: "btn-variant" }), /styles before client JavaScript/);
      } finally {
        await broken.close();
      }
    });
    for (const caseId of ["btn-variant", "dyn-translate"]) await t.test(caseId, async () => {
      await validateBrowserFixture(browser, { port: server.port, ssrMod, caseId });
      const result = ssrMod.renderCase(caseId, 3);
      assert.match(result.head, tech === "emotion" ? /data-emotion="e / : tech === "styled-components" ? /data-styled=/ : /id="_goober"/);
      assert.ok(result.css.length > 0);
      assert.equal(ssrMod.renderCase(caseId, 3).head, result.head, "each request returns its required style tags");
      const url = `http://127.0.0.1:${server.port}/?case=${caseId}&n=3&manual=1`;
      const ssrPage = await browser.newPage({ javaScriptEnabled: false });
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      try {
        await ssrPage.goto(url);
        const initial = await ssrPage.evaluate(appearance);
        const initialRules = await ssrPage.evaluate(matchingRules);
        assert.ok(initialRules.length > 0, "SSR supplies usable CSS before JavaScript");
        if (caseId === "btn-variant") {
          assert.equal(initial[0].padding, "8px 16px");
          assert.equal(initial[0].background, "rgb(209, 213, 219)");
        } else {
          assert.equal(initial[0].width, "8px");
          assert.equal(initial[2].transform, "matrix(1, 0, 0, 1, 2, 0)");
        }
        await page.goto(url);
        await page.waitForFunction(() => typeof window.__hydrate === "function");
        await page.evaluate(() => { window.__ssrInstances = [...document.getElementById("root").children]; window.__hydrate(); });
        await page.waitForFunction(() => window.__hydrateMs !== undefined);
        assert.deepEqual(await page.evaluate(appearance), initial, "hydration preserves computed styles");
        assert.deepEqual(await page.evaluate(matchingRules), initialRules, "hydration reuses CSS without duplicate rules");
        assert.ok(await page.evaluate(() => [...document.getElementById("root").children].every((element, i) => element === window.__ssrInstances[i])), "hydration preserves the server DOM");
        await page.evaluate(async () => { await window.__prepareInp(); await window.__inp(); });
        const changed = await page.evaluate(appearance);
        assert.deepEqual(changed.map((value) => value.text), ["1", "2", "3"]);
        if (caseId === "btn-variant") {
          assert.equal(changed[0].padding, "8px 16px");
          assert.equal(changed[0].background, "rgb(243, 244, 246)");
        } else {
          assert.deepEqual(changed.map((value) => value.transform), [1, 2, 3].map((i) => `matrix(1, 0, 0, 1, ${i}, 0)`));
        }
        assert.deepEqual(errors, [], "hydration and the update report no browser errors");
      } finally {
        await ssrPage.close();
        await page.close();
      }
    });
  });
});
