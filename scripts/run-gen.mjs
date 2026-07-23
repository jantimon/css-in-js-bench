import { spawn } from "node:child_process";

// `pnpm gen` — the full-suite entry. With no filters it runs the whole battery end to end:
// gen:samples → gen:wpd → report. With --tech/--case it regenerates only those cells in BOTH
// the sample battery and the WPD lanes, then STOPS before report: a filtered WPD run leaves the
// manifest incomplete and is deliberately not reportable (see scripts/run-wpd.mjs). --measure
// (samples-only) and --lane (wpd-only) can't apply to the combined run, so run those stages direct.

const argv = process.argv.slice(2);
const forwarded = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--tech" || arg === "--case") forwarded.push(arg, argv[++i]);
  else if (arg.startsWith("--tech=") || arg.startsWith("--case=")) forwarded.push(arg);
  else {
    console.error(`gen: unknown flag ${arg} — only --tech/--case work on the full gen. Use \`pnpm gen:samples\` for --measure or \`pnpm gen:wpd\` for --lane.`);
    process.exit(1);
  }
}
const filtered = forwarded.length > 0;

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const run = (args) => new Promise((resolve, reject) => {
  const proc = spawn(pnpm, args, { stdio: "inherit" });
  proc.once("error", reject);
  proc.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} stopped (${signal ?? code})`)));
});

try {
  await run(["gen:samples", ...forwarded]);
  await run(["gen:wpd", ...forwarded]);
  if (filtered) console.log("\ngen: filtered run — skipping report. A partial WPD run isn't reportable (manifest incomplete). Run a full `pnpm gen` to publish.");
  else await run(["report"]);
} catch (error) {
  console.error(`gen: ${error.message}`);
  process.exitCode = 1;
}
