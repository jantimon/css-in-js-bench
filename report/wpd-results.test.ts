import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { WPD_LANES, WPD_RESULT_FILES, validateWpdResults, wpdResultFile, type WpdManifest } from "./wpd-results.ts";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "wpd-validator-"));
  mkdirSync(dir, { recursive: true });
  const keys = ["case/tech"];
  writeFileSync(join(dir, "snapshot.json"), JSON.stringify({ [keys[0]]: {} }));
  const lanes = Object.fromEntries(WPD_LANES.map((lane) => [lane, { run: 1, ok: 1, fail: 0, startedAt: "2026-01-01T00:00:00Z", finishedAt: "2026-01-01T00:01:00Z", loadAverageStart: [0, 0, 0], loadAverageEnd: [0, 0, 0] }]));
  const manifest: WpdManifest = { schemaVersion: 1, runId: "run", complete: true, expectedCells: 1, lanes,
    environment: { gitSha: "abc", host: "host", node: "v1", platform: "darwin", release: "1", arch: "arm64", cpuModel: "cpu", logicalCpus: 1 },
    wpd: { version: "0.7.0", headlessMode: "shell", chrome: "1", firefox: "1" }, config: { n: 50 } };
  for (const file of WPD_RESULT_FILES) writeFileSync(join(dir, wpdResultFile(file)), JSON.stringify({ [keys[0]]: [{}] }));
  const save = () => writeFileSync(join(dir, "measurement-wpd-tally.json"), JSON.stringify(manifest));
  save();
  return { dir, manifest, save };
}

test("accepts one complete, exact WPD run", () => { const f = fixture(); assert.equal(validateWpdResults(f.dir).wpd.version, "0.7.0"); });
test("rejects an incomplete run", () => { const f = fixture(); f.manifest.complete = false; f.save(); assert.throws(() => validateWpdResults(f.dir), /not complete/); });
test("rejects a missing lane file", () => { const f = fixture(); unlinkSync(join(f.dir, wpdResultFile("ssr"))); assert.throws(() => validateWpdResults(f.dir), /missing/); });
test("rejects missing or extra cells", () => { const f = fixture(); writeFileSync(join(f.dir, wpdResultFile("ssr")), JSON.stringify({ "case/tech": [], "case/extra": [] })); assert.throws(() => validateWpdResults(f.dir), /extra: case\/extra/); });
test("rejects tally failures", () => { const f = fixture(); f.manifest.lanes.ssr!.ok = 0; f.manifest.lanes.ssr!.fail = 1; f.save(); assert.throws(() => validateWpdResults(f.dir), /tally/); });
test("rejects metadata mismatch", () => { const f = fixture(); f.manifest.environment.cpuModel = ""; f.save(); assert.throws(() => validateWpdResults(f.dir), /metadata/); });
test("rejects another schema", () => { const f = fixture(); (f.manifest as any).schemaVersion = 2; f.save(); assert.throws(() => validateWpdResults(f.dir), /schema/); });
