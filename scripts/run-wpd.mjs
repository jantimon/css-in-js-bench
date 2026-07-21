import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadavg } from "node:os";

// The `mount` lane records a run group (--members breakdown,deep) that also emits the blame result
// file (its deep member), so there is no separate `blame` lane.
export const LANES = ["ssr", "mount", "hydrate", "inp", "firefox"];
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export function parseWpdArgs(argv) {
  const parsed = { lanes: [...LANES], tech: undefined, caseId: undefined };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = (name) => arg.startsWith(`${name}=`) ? arg.slice(name.length + 1) : arg === name ? argv[++index] : undefined;
    const lane = value("--lane");
    if (lane !== undefined) parsed.lanes = lane.split(",").map((item) => item.trim()).filter(Boolean);
    else {
      const tech = value("--tech");
      if (tech !== undefined) parsed.tech = tech;
      else { const caseId = value("--case"); if (caseId !== undefined) parsed.caseId = caseId; }
    }
  }
  const invalid = parsed.lanes.filter((lane) => !LANES.includes(lane));
  if (!parsed.lanes.length || invalid.length) throw new Error(`unknown WPD lane(s): ${invalid.join(", ") || "none"}`);
  return parsed;
}

const child = (args, env) => new Promise((resolve, reject) => {
  const proc = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: "inherit" });
  proc.once("error", reject);
  proc.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`child stopped (${signal ?? code})`)));
});

export async function runLanesSequentially(lanes, runLane) {
  for (const lane of lanes) await runLane(lane);
}

async function waitForIdle() {
  console.log("WPD idle gate: waiting for five consecutive one-minute samples below 2.0");
  let consecutive = 0;
  while (consecutive < 5) {
    await new Promise((resolve) => setTimeout(resolve, 60_000));
    const current = loadavg()[0];
    consecutive = current < 2 ? consecutive + 1 : 0;
    console.log(`WPD idle gate: load ${current.toFixed(2)} · ${consecutive}/5`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseWpdArgs(argv);
  const full = parsed.lanes.length === LANES.length && LANES.every((lane, index) => parsed.lanes[index] === lane) && !parsed.tech && !parsed.caseId;
  if (!existsSync(join(ROOT, "vendor", "wpd", "node_modules", ".bin", "wpd")))
    throw new Error("WPD is required; run `pnpm setup:wpd` first");
  if (full) await waitForIdle();

  const result = join(ROOT, "result");
  rmSync(join(result, "measurement-wpd-tally.json"), { force: true });
  for (const lane of parsed.lanes) rmSync(join(result, `measurement-wpd-${lane}.json`), { force: true });
  // The blame file rides the mount lane's run group, so clear it whenever mount reruns.
  if (parsed.lanes.includes("mount")) rmSync(join(result, "measurement-wpd-blame.json"), { force: true });
  const runId = `${new Date().toISOString()}-${process.pid}`;
  const forwarded = [parsed.tech && `--tech=${parsed.tech}`, parsed.caseId && `--case=${parsed.caseId}`].filter(Boolean);
  await runLanesSequentially(parsed.lanes, (lane) => child(["--import", "tsx", "./gen-wpd.ts", `--lane=${lane}`, ...forwarded], {
    WPD_RUN_ID: runId, WPD_EXPECTED_FULL: full ? "1" : "0",
  }));
  if (full) await child(["--import", "tsx", "./scripts/validate-wpd-results.ts", "--finalize"], {});
  else console.log("WPD filtered run complete but intentionally not reportable (manifest remains incomplete).");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch((error) => { console.error(`gen:wpd: ${error.message}`); process.exitCode = 1; });
