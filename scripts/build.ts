// `pnpm build` — a full report build in one command, resumable.
//
//   clean → samples → backfill → wpd → verify → report
//
// Each finished stage leaves a marker in .build/done/, so a rerun continues where the last
// run stopped. `--fresh` clears the markers first; `--from <stage>` clears that stage and
// every later one. Everything the stages print goes to the terminal and to .build/build.log;
// .build/status.json holds stage timings plus every skipped and refilled cell (`--status`
// prints it). A build takes hours, so start it detached:
//
//   nohup caffeinate -is pnpm build > /dev/null 2>&1 &     # then: tail -f .build/build.log
//
// samples runs with SKIP_VERIFY=1 because verify is its own stage here, after WPD. backfill
// re-measures each (lane, measure) the samples stage skipped, three attempts each; a lane
// whose build failed is retried with every per-lane measure. autocannon cannot be refilled
// per lane (it needs every lane at once), so such a lane ends up in status.unresolved.
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BUILD = join(ROOT, ".build");
const DONE = join(BUILD, "done");
const LOG = join(BUILD, "build.log");
const STATUS = join(BUILD, "status.json");
const SKIPPED = join(BUILD, "skipped.json");
const TECHS = join(ROOT, "techs");
const MEASURES = ["microbench", "payload", "nsweep", "autocannon", "hydrate", "inp", "mount", "screenshots", "buildtime"];
const PER_LANE = MEASURES.filter((m) => m !== "autocannon");
const STAGES = ["clean", "samples", "backfill", "wpd", "verify", "report"] as const;
type Stage = (typeof STAGES)[number];

const USAGE = `pnpm build — measure every lane and case, then write BENCHMARK.html

  usage: pnpm build [--fresh | --from <stage>] [--status]

  stages: ${STAGES.join(" → ")}
  --fresh          forget finished stages and start over
  --from <stage>   redo that stage and every later one
  --status         print .build/status.json and exit`;

type Status = {
  startedAt: string;
  updatedAt: string;
  stage: Stage | "done" | "failed";
  stages: Partial<Record<Stage, { startedAt: string; finishedAt?: string; ok?: boolean }>>;
  skipped: string[];
  refilled: string[];
  unresolved: string[];
  error?: string;
};

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
if (args.includes("--status")) {
  console.log(existsSync(STATUS) ? readFileSync(STATUS, "utf8") : "no build in progress");
  process.exit(0);
}
if (args.includes("--fresh")) rmSync(BUILD, { recursive: true, force: true });
const fromIndex = args.indexOf("--from");
if (fromIndex !== -1) {
  const from = args[fromIndex + 1] as Stage;
  if (!STAGES.includes(from)) {
    console.error(`build: unknown stage "${from}"\n${USAGE}`);
    process.exit(1);
  }
  for (const stage of STAGES.slice(STAGES.indexOf(from))) rmSync(join(DONE, stage), { force: true });
}
const unknown = args.filter((a, i) => !["--fresh", "--from", "--status"].includes(a) && args[i - 1] !== "--from");
if (unknown.length) {
  console.error(`build: unknown flag ${unknown.join(" ")}\n${USAGE}`);
  process.exit(1);
}

mkdirSync(DONE, { recursive: true });
const status: Status = existsSync(STATUS)
  ? JSON.parse(readFileSync(STATUS, "utf8"))
  : { startedAt: new Date().toISOString(), updatedAt: "", stage: "clean", stages: {}, skipped: [], refilled: [], unresolved: [] };
const save = () => {
  status.updatedAt = new Date().toISOString();
  writeFileSync(STATUS, JSON.stringify(status, null, 2) + "\n");
};
const say = (line: string) => {
  const stamped = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] build: ${line}`;
  console.log(stamped);
  appendFileSync(LOG, stamped + "\n");
};

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
/** Run a pnpm script, mirroring its output to the terminal and the log; resolves with the exit code and the captured output. */
function run(scriptArgs: string[], env: Record<string, string> = {}): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    say(`$ pnpm ${scriptArgs.join(" ")}`);
    const child = spawn(pnpm, scriptArgs, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const relay = (target: NodeJS.WriteStream) => (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      target.write(text);
      appendFileSync(LOG, text);
    };
    child.stdout.on("data", relay(process.stdout));
    child.stderr.on("data", relay(process.stderr));
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code: code ?? (signal ? 1 : 0), output }));
  });
}

const SKIP_MEASURE = /^\s*✗ ([a-z0-9-]+) · ([a-z]+): .* — skipped$/gm;
const SKIP_BUILD = /^\s*✗ ([a-z0-9-]+): build failed — skipped/gm;

const stages: Record<Stage, () => Promise<void>> = {
  async clean() {
    let cleared = 0;
    for (const tech of readdirSync(TECHS, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      for (const dir of readdirSync(join(TECHS, tech.name))) {
        if (dir === "dist" || dir.startsWith("dist-")) {
          rmSync(join(TECHS, tech.name, dir), { recursive: true, force: true });
          cleared++;
        }
      }
    }
    say(`cleared ${cleared} build output dir(s)`);
  },
  async samples() {
    const { code, output } = await run(["gen:samples", `--measure=${MEASURES.join(",")}`], { SKIP_VERIFY: "1" });
    if (code !== 0) throw new Error(`gen:samples exited ${code}`);
    const pairs = [...output.matchAll(SKIP_MEASURE)].map((m) => `${m[1]} ${m[2]}`);
    const lanes = [...output.matchAll(SKIP_BUILD)].map((m) => m[1]);
    writeFileSync(SKIPPED, JSON.stringify({ pairs, lanes }, null, 2) + "\n");
    status.skipped = [...lanes.map((lane) => `${lane} (build failed)`), ...pairs];
    say(pairs.length + lanes.length ? `skipped: ${status.skipped.join(", ")}` : "nothing skipped");
  },
  async backfill() {
    const { pairs, lanes } = existsSync(SKIPPED) ? JSON.parse(readFileSync(SKIPPED, "utf8")) : { pairs: [], lanes: [] };
    const jobs: { label: string; args: string[]; failed: RegExp }[] = [
      ...lanes.map((lane: string) => ({
        label: `${lane} (all per-lane measures)`,
        args: ["gen:samples", "--tech", lane, `--measure=${PER_LANE.join(",")}`],
        failed: new RegExp(`^\\s*✗ ${lane}\\b`, "m"),
      })),
      ...pairs.map((pair: string) => {
        const [lane, measure] = pair.split(" ");
        return { label: `${lane} · ${measure}`, args: ["gen:samples", "--tech", lane, `--measure=${measure}`], failed: new RegExp(`^\\s*✗ ${lane} · ${measure}:`, "m") };
      }),
    ];
    if (!jobs.length) {
      say("nothing to refill");
      return;
    }
    for (const job of jobs) {
      let filled = false;
      for (let attempt = 1; attempt <= 3 && !filled; attempt++) {
        const { code, output } = await run(job.args);
        filled = code === 0 && !job.failed.test(output);
        say(`${job.label}: attempt ${attempt} ${filled ? "filled" : "still skipped"}`);
      }
      if (filled) status.refilled.push(job.label);
      else status.unresolved.push(`${job.label}: still skipped after 3 attempts`);
      save();
    }
    for (const lane of lanes) status.unresolved.push(`${lane}: autocannon needs an unfiltered \`pnpm gen:samples --measure=autocannon\``);
  },
  async wpd() {
    const { code } = await run(["gen:wpd"]);
    if (code !== 0) throw new Error(`gen:wpd exited ${code}`);
  },
  async verify() {
    const { code } = await run(["verify"]);
    if (code !== 0) throw new Error(`verify exited ${code} — see result/verify/`);
  },
  async report() {
    const { code } = await run(["report"]);
    if (code !== 0) throw new Error(`report exited ${code}`);
  },
};

delete status.error;
say(`start (${STAGES.filter((stage) => existsSync(join(DONE, stage))).join(", ") || "nothing"} already done)`);
try {
  for (const stage of STAGES) {
    if (existsSync(join(DONE, stage))) continue;
    status.stage = stage;
    status.stages[stage] = { startedAt: new Date().toISOString() };
    save();
    say(`stage ${stage}`);
    await stages[stage]();
    status.stages[stage]!.finishedAt = new Date().toISOString();
    status.stages[stage]!.ok = true;
    writeFileSync(join(DONE, stage), "");
    save();
  }
  status.stage = "done";
  save();
  say(`complete — BENCHMARK.html written${status.unresolved.length ? `; unresolved: ${status.unresolved.join("; ")}` : ""}`);
} catch (error) {
  status.stage = "failed";
  status.error = (error as Error).message;
  save();
  say(`FAILED: ${status.error} — fix the cause and rerun \`pnpm build\` to resume`);
  process.exit(1);
}
