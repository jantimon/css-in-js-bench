import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { chromium } from "@playwright/test";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
process.env.NODE_ENV = "production";

async function clientBundle(tech) {
  let config = (await import(pathToFileURL(join(ROOT, "techs", tech, "vite.hydrate.config.ts")).href)).default;
  if (typeof config === "function") config = await config();
  const result = await build({ ...config, configFile: false, logLevel: "error", build: { ...config.build, write: false } });
  return new Map(result.output.map((file) => [file.fileName, file.type === "chunk" ? file.code : file.source]));
}

// Compare text, nesting and attributes, allowing framework hydration markers and
// differences in adjacent text-node boundaries. Styling classes remain part of parity.
function readInstances() {
  const read = (element) => {
    const attrs = Object.fromEntries(element.getAttributeNames().filter((name) => name !== "_hk").sort().map((name) => {
      const value = name === "class" ? [...element.classList].sort().join(" ") : element.getAttribute(name);
      return [name, value];
    }));
    const children = [];
    for (const node of element.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) children.push(read(node));
      else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        if (typeof children.at(-1) === "string") children[children.length - 1] += node.textContent;
        else children.push(node.textContent);
      }
    }
    return { tag: element.tagName, attrs, children };
  };
  return [...document.getElementById("root").children].map(read);
}

test("React and Solid repeat the same changed input and restore the initial output", { timeout: 180_000 }, async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const bundles = new Map();
  const techs = new Set(["vanilla", "vanilla-solid", ...(process.env.INTERACTION_TECHS?.split(",").filter(Boolean) ?? [])]);
  for (const tech of techs) bundles.set(tech, await clientBundle(tech));
  const cases = readdirSync(join(ROOT, "cases")).filter((name) => name.endsWith(".ts")).map((name) => name.slice(0, -3));
  const flow = readFileSync(join(ROOT, "scripts/wpd/bench-flow.mjs"), "utf8");

  async function pageFor(tech, caseId, n) {
    const page = await browser.newPage();
    await page.route("http://interaction.test/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: '<!doctype html><div id="root"></div><script type="module" src="/entry.js"></script>' });
      if (url.pathname === "/bench-flow.mjs") return route.fulfill({ contentType: "text/javascript", body: flow });
      const asset = bundles.get(tech).get(url.pathname.slice(1));
      assert.ok(asset, `missing asset ${tech}${url.pathname}`);
      return route.fulfill({ contentType: url.pathname.endsWith(".css") ? "text/css" : "text/javascript", body: asset });
    });
    await page.goto(`http://interaction.test/?case=${caseId}&n=${n}&mount=1&phase=inp`);
    await page.waitForFunction(() => typeof window.__mount === "function");
    await page.evaluate(() => window.__mount());
    await page.waitForFunction(() => window.__mountMs !== undefined);
    return page;
  }

  for (const caseId of cases) await t.test(caseId, async () => {
    // Rendering inputs 0..8 provides independent expected output for both 0..7
    // and 1..8, without computing it through the interaction implementation.
    const reference = await pageFor("vanilla", caseId, 9);
    const expected = await reference.evaluate(readInstances);
    await reference.close();
    assert.equal(expected.length, 9);
    for (const tech of bundles.keys()) {
      if (!readdirSync(join(ROOT, "techs", tech, "case")).includes(caseId)) continue;
      let laneExpected = expected;
      if (tech !== "vanilla" && tech !== "vanilla-solid") {
        const reference = await pageFor(tech, caseId, 9);
        laneExpected = await reference.evaluate(readInstances);
        await reference.close();
      }
      const page = await pageFor(tech, caseId, 8);
      try {
        assert.deepEqual(await page.evaluate(readInstances), laneExpected.slice(0, 8), `${tech}: initial state`);
        await assert.rejects(page.evaluate(() => window.__inp()), /requires __prepareInp/);
        if (caseId === "btn-variant") await page.evaluate(() => { window.__buttons = [...document.querySelectorAll("button")]; });
        for (let iteration = 0; iteration < 3; iteration++) {
          await page.evaluate(async () => { await window.__prepareInp(); performance.mark("test:reset:end"); });
          assert.deepEqual(await page.evaluate(readInstances), laneExpected.slice(0, 8), `${tech}: reset ${iteration}`);
          const ms = await page.evaluate(() => window.__inp());
          assert.ok(Number.isFinite(ms) && ms >= 0);
          assert.deepEqual(await page.evaluate(readInstances), laneExpected.slice(1), `${tech}: changed state ${iteration}`);
          assert.ok(await page.evaluate(() => performance.getEntriesByName("inp:start").at(-1).startTime >= performance.getEntriesByName("test:reset:end").at(-1).startTime));
          await assert.rejects(page.evaluate(() => window.__inp()), /requires __prepareInp/);
          if (caseId === "btn-variant") assert.ok(await page.evaluate(() => [...document.querySelectorAll("button")].every((button, i) => button === window.__buttons[i])), `${tech}: instance identity`);
        }
      } finally {
        await page.close();
      }
    }
  });

  await t.test("WPD resets outside the named action span on every iteration", async () => {
    const page = await pageFor("vanilla", "btn-variant", 8);
    try {
      await page.evaluate(async () => {
        window.__hydrateMs = window.__mountMs;
        const prepare = window.__prepareInp;
        window.__prepareInp = async () => { await prepare(); performance.mark("test:reset:end"); };
        window.__flow = await import("/bench-flow.mjs");
        await window.__flow.prepare();
      });
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.__flow.run());
        const values = await page.evaluate(() => ({
          text: document.querySelector("button").textContent,
          resetEnd: performance.getEntriesByName("test:reset:end").at(-1).startTime,
          frame: performance.getEntriesByName("inp:frame").at(-1).toJSON(),
          update: performance.getEntriesByName("inp").at(-1).toJSON(),
        }));
        assert.equal(values.text, "1");
        assert.ok(values.frame.startTime >= values.resetEnd);
        assert.ok(values.update.startTime >= values.frame.startTime);
        assert.ok(values.update.startTime + values.update.duration <= values.frame.startTime + values.frame.duration);
      }
    } finally {
      await page.close();
    }
  });

  await t.test("reset waits for finite CSS transitions", async () => {
    const page = await pageFor("vanilla", "btn-variant", 8);
    try {
      await page.addStyleTag({ content: ".btn { opacity: 1; transition: opacity 150ms linear; } .btnInactive { opacity: 0.4; }" });
      for (let i = 0; i < 2; i++) {
        await page.evaluate(() => window.__prepareInp());
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("button")).opacity), "0.4");
        await page.evaluate(() => window.__inp());
        await page.waitForTimeout(60);
        assert.ok(await page.evaluate(() => document.getElementById("root").getAnimations({ subtree: true }).length > 0));
      }
      await page.evaluate(() => window.__prepareInp());
      assert.equal(await page.evaluate(() => document.getElementById("root").getAnimations({ subtree: true }).length), 0);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("button")).opacity), "0.4");
    } finally {
      await page.close();
    }
  });
});
