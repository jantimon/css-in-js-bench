import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { utilityMaxInput } from "./browser-styles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeLanes = new Set(["styled-components", "emotion", "goober"]);
const utilityLanes = new Set(["tailwind-merge", "cn", "cnfast"]);

for (const tech of readdirSync(resolve(root, "techs"))) {
  test(`${tech} emits linked browser styles for every supported case`, { timeout: 120_000 }, async () => {
    let config = (await import(pathToFileURL(resolve(root, "techs", tech, "vite.hydrate.config.ts")).href)).default;
    if (typeof config === "function") config = await config();
    const result = await build({ ...config, configFile: false, logLevel: "error", build: { ...config.build, write: false } });
    assert.ok(!Array.isArray(result) && "output" in result);
    const assets = new Map(result.output.filter((file) => file.type === "asset").map((file) => [file.fileName, String(file.source)]));
    const manifest = JSON.parse(assets.get(".vite/manifest.json")!);
    const metadata = JSON.parse(assets.get("browser-styles.json")!);
    const entry = manifest["client-entry.tsx"];
    assert.equal(entry.isEntry, true);
    const css = entry.css ?? [];
    assert.deepEqual(Object.keys(metadata.cases).sort(), readdirSync(resolve(root, "techs", tech, "case")).sort());
    for (const [caseId, sheets] of Object.entries(metadata.cases)) {
      const files = [...css, ...(sheets as string[])];
      if (!runtimeLanes.has(tech)) assert.ok(files.length, `${tech}/${caseId} has no linked stylesheet`);
      for (const file of files) assert.ok(assets.get(file)?.trim(), `missing or empty CSS: ${file}`);
    }
    if (tech === "vanilla" || tech === "vanilla-solid") {
      assert.notDeepEqual(metadata.cases["btn-variant"], metadata.cases["compose-1"], "case selectors must stay isolated");
    }
    if (utilityLanes.has(tech)) {
      assert.equal(metadata.maxInput["dyn-translate"], utilityMaxInput);
      const sheet = css.map((file: string) => assets.get(file)).join("\n");
      assert.ok(sheet.includes(`translateX\\(${utilityMaxInput}px\\)`) && /transform:translate(?:X)?\(/.test(sheet), "changed last input must have a utility rule");
      assert.ok(sheet.includes("background-color"), "source-scanned utilities must exist");
    }
  });
}
