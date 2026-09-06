import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import { validateBrowserFixture } from "./browser-validation.ts";

const css = "button { padding: 9px 13px; border-radius: 7px; background: rgb(20, 40, 60); color: white; } button.odd { background: rgb(60, 40, 20); }";
const render = (n) => Array.from({ length: n }, (_, i) => `<button class="${i % 2 ? "odd" : "even"}">${i}</button>`).join("");
const ssrMod = { renderCase: (_caseId, n) => ({ html: render(n), css }) };

async function serve({ missingCss = false, replaceOnHydrate = false, consoleError = false } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://fixture.test");
    if (url.pathname === "/style.css") {
      res.setHeader("content-type", "text/css");
      res.end(missingCss ? "" : css);
      return;
    }
    if (url.pathname === "/entry.js") {
      res.setHeader("content-type", "text/javascript");
      res.end(`
        const params = new URLSearchParams(location.search);
        const n = Number(params.get("n"));
        const root = document.getElementById("root");
        const render = ${render.toString()};
        const update = (offset) => [...root.children].forEach((button, i) => {
          button.textContent = String(i + offset);
          button.className = (i + offset) % 2 ? "odd" : "even";
        });
        window.__hydrate = () => {
          ${replaceOnHydrate ? "root.innerHTML = render(n);" : ""}
          ${consoleError ? 'console.error("Hydration failed");' : ""}
          window.__hydrateMs = 1;
        };
        window.__mount = () => { root.innerHTML = render(n); window.__mountMs = 1; };
        window.__prepareInp = async () => update(0);
        window.__inp = async () => { update(1); return 1; };
      `);
      return;
    }
    const n = Number(url.searchParams.get("n"));
    const html = url.searchParams.get("mount") === "1" ? "" : render(n);
    res.setHeader("content-type", "text/html");
    res.end(`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/style.css"><div id="root">${html}</div><script type="module" src="/entry.js"></script>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { port: server.address().port, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("browser fixture validation rejects incomplete CSS and false hydration", { timeout: 60_000 }, async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  for (const [name, options, failure] of [
    ["accepts styled SSR, hydration, changed input and cold mount", {}, null],
    ["rejects an empty production stylesheet", { missingCss: true }, /styles before client JavaScript/],
    ["rejects replacement of SSR elements", { replaceOnHydrate: true }, /hydration must retain SSR workload elements/],
    ["rejects hydration console errors", { consoleError: true }, /hydration browser errors/],
  ]) await t.test(name, async () => {
    const fixture = await serve(options);
    try {
      const validation = validateBrowserFixture(browser, { port: fixture.port, ssrMod, caseId: "button" });
      if (failure) await assert.rejects(validation, failure);
      else await validation;
    } finally {
      await fixture.close();
    }
  });
});
