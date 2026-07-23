import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The recording lanes: each is one `gen-wpd` invocation and one manifest tally. `mount` records a
// run group (--members breakdown,deep) that answers the render-timing question in one capture, so
// there is no separate `blame` lane -- but it still emits the `blame` result FILE (the deep member's
// counts + forced sites, stitched onto the breakdown member's durations). WPD_RESULT_FILES is the
// full set of measurement files a complete run leaves; validation checks every file's keys but only
// the lanes' tallies.
export const WPD_LANES = ["ssr", "mount", "hydrate", "inp", "firefox"] as const;
export type WpdLane = (typeof WPD_LANES)[number];
export const WPD_RESULT_FILES = [...WPD_LANES, "blame"] as const;
export type WpdResultFile = (typeof WPD_RESULT_FILES)[number];

export interface WpdLaneRun {
  run: number;
  ok: number;
  fail: number;
  startedAt: string;
  finishedAt: string;
  loadAverageStart: number[];
  loadAverageEnd: number[];
}

export interface WpdManifest {
  schemaVersion: 1;
  runId: string;
  complete: boolean;
  expectedCells: number;
  lanes: Partial<Record<WpdLane, WpdLaneRun>>;
  environment: {
    gitSha: string; host: string; node: string; platform: string; release: string;
    arch: string; cpuModel: string; logicalCpus: number;
  };
  wpd: { version: string; headlessMode: string; chrome: string; firefox: string };
  config: { n: number };
}

export const WPD_MANIFEST = "measurement-wpd-tally.json";
export const wpdResultFile = (file: WpdResultFile) => `measurement-wpd-${file}.json`;

export function writeJsonAtomic(file: string, value: unknown): void {
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value)}\n`);
  renameSync(temporary, file);
}

const readRequired = <T,>(file: string): T => {
  if (!existsSync(file)) throw new Error(`WPD results incomplete: missing ${file}`);
  return JSON.parse(readFileSync(file, "utf8")) as T;
};

const sameKeys = (expected: string[], actual: string[]) =>
  expected.length === actual.length && expected.every((key, index) => key === actual[index]);

export function validateWpdResults(resultDir: string, options: { finalize?: boolean } = {}): WpdManifest {
  const manifestFile = join(resultDir, WPD_MANIFEST);
  const manifest = readRequired<WpdManifest>(manifestFile);
  if (manifest.schemaVersion !== 1) throw new Error(`WPD manifest schema must be 1, got ${String(manifest.schemaVersion)}`);
  if (!options.finalize && manifest.complete !== true) throw new Error("WPD results incomplete: manifest is not complete");
  if (options.finalize && manifest.complete !== false) throw new Error("WPD finalization requires an incomplete manifest");

  const requiredStrings = [manifest.runId, manifest.environment?.gitSha, manifest.environment?.host,
    manifest.environment?.node, manifest.environment?.platform, manifest.environment?.release,
    manifest.environment?.arch, manifest.environment?.cpuModel, manifest.wpd?.version,
    manifest.wpd?.headlessMode, manifest.wpd?.chrome, manifest.wpd?.firefox];
  if (requiredStrings.some((value) => typeof value !== "string" || value.length === 0))
    throw new Error("WPD manifest metadata is incomplete");
  if (!Number.isInteger(manifest.environment.logicalCpus) || manifest.environment.logicalCpus < 1 ||
      !Number.isFinite(manifest.config?.n)) throw new Error("WPD manifest metadata is inconsistent");

  const snapshot = readRequired<Record<string, unknown>>(join(resultDir, "snapshot.json"));
  const expectedKeys = Object.keys(snapshot).sort();
  if (manifest.expectedCells !== expectedKeys.length)
    throw new Error(`WPD expectedCells ${manifest.expectedCells} does not match snapshot ${expectedKeys.length}`);

  for (const lane of WPD_LANES) {
    const record = manifest.lanes?.[lane];
    if (!record) throw new Error(`WPD manifest missing lane ${lane}`);
    if (!record.startedAt || !record.finishedAt || record.loadAverageStart?.length !== 3 || record.loadAverageEnd?.length !== 3)
      throw new Error(`WPD lane ${lane} metadata is incomplete`);
    if (record.run !== expectedKeys.length || record.ok !== expectedKeys.length || record.fail !== 0 || record.run !== record.ok + record.fail)
      throw new Error(`WPD lane ${lane} tally is not complete (${record.run}/${record.ok}/${record.fail})`);
  }

  for (const file of WPD_RESULT_FILES) {
    const data = readRequired<Record<string, unknown>>(join(resultDir, wpdResultFile(file)));
    const keys = Object.keys(data).sort();
    if (!sameKeys(expectedKeys, keys)) {
      const missing = expectedKeys.filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !expectedKeys.includes(key));
      throw new Error(`WPD result ${file} key mismatch (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`);
    }
  }

  if (options.finalize) {
    manifest.complete = true;
    writeJsonAtomic(manifestFile, manifest);
  }
  return manifest;
}
