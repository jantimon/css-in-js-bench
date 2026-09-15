import test from "node:test";
import { mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { chromium } from "@playwright/test";
import { serveBrowserFixture } from "./browser-fixture.ts";
import { validateBrowserFixture } from "./browser-validation.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.NODE_ENV = "production";

async function bundle(tech: string, kind: "hydrate" | "microbench") {
  const lane = resolve(root, "techs", tech);
  mkdirSync(resolve(lane, "dist"), { recursive: true });
  const outDir = mkdtempSync(resolve(lane, `dist/test-browser-${kind}-`));
  let config = (await import(pathToFileURL(resolve(lane, `vite.${kind}.config.ts`)).href)).default;
  if (typeof config === "function") config = await config();
  await build({ ...config, configFile: false, logLevel: "error", build: { ...config.build, outDir } });
  return outDir;
}

const techs = process.env.BROWSER_STYLES_TECHS?.split(",") ?? ["vanilla", "vanilla-solid", "tailwind-merge", "panda", "stylex", "next-yak", "yak-solid", "bamboo"];
for (const tech of techs) {
  test(`${tech} serves working CSS before hydration, after update, and on cold mount`, { timeout: 180_000 }, async (t) => {
    const browser = await chromium.launch();
    t.after(() => browser.close());
    const directory = await bundle(tech, "hydrate");
    const ssrDirectory = await bundle(tech, "microbench");
    const ssrMod = await import(pathToFileURL(resolve(ssrDirectory, "entry.mjs")).href);
    const fixture = await serveBrowserFixture({ directory, ssrMod });
    t.after(() => fixture.close());
    const supported = readdirSync(resolve(root, "techs", tech, "case"));
    const cases = process.env.BROWSER_STYLES_CASES === "all" || tech === "panda" || tech === "bamboo"
      ? supported : ["btn-variant", "dyn-translate", "realistic-button", "tabs"];
    for (const caseId of cases) {
      if (!supported.includes(caseId)) continue;
      await t.test(caseId, () => validateBrowserFixture(browser, { port: fixture.port, ssrMod, caseId }));
    }
  });
}
