import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { httpResults } from "../report/http-results.ts";
import { writeJsonAtomic } from "../report/wpd-results.ts";
import { runHttpSchedule } from "./http-schedule.mjs";

export const HTTP_CHECKPOINT = "_http-checkpoint.json";
const resultFile = "measurement-autocannon.json";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** Save progress separately and publish only a complete HTTP pass. */
export async function runHttpPass(jobs, config, { resultDir, resume = false, runSchedule = runHttpSchedule, onCell = () => {} }) {
  mkdirSync(resultDir, { recursive: true });
  const checkpointFile = join(resultDir, HTTP_CHECKPOINT);
  let cells = {};
  if (resume) {
    let checkpoint;
    try { checkpoint = JSON.parse(readFileSync(checkpointFile, "utf8")); }
    catch (error) { throw new Error(`Cannot resume HTTP pass: checkpoint is missing or unreadable (${checkpointFile})`, { cause: error }); }
    if (object(checkpoint) && checkpoint.status === "preparing")
      throw new Error("Cannot resume HTTP pass: preparation has no validated bundle cohort; start a fresh --measure=autocannon pass");
    if (!object(checkpoint) || !["running", "failed", "complete"].includes(checkpoint.status) || !object(checkpoint.cells))
      throw new Error("Cannot resume HTTP pass: invalid checkpoint");
    cells = checkpoint.cells;
  }
  const save = (status, error) => writeJsonAtomic(checkpointFile, { status, cells, ...(error ? { error } : {}) });
  save("running");
  try {
    cells = await runSchedule(jobs, config, {
      ...(resume ? { existingCells: cells } : {}),
      onInitialize: async (initialized) => { cells = initialized; save("running"); },
      onCell: async (key, cell) => {
        cells[key] = cell;
        save("running");
        await onCell(key, cell);
      },
    });
    const expected = jobs.map((job) => job.key).sort();
    const actual = Object.keys(cells).sort();
    if (expected.length !== actual.length || expected.some((key, index) => key !== actual[index]))
      throw new Error("HTTP pass cannot publish: result cells differ from the requested jobs");
    httpResults(cells);
    writeJsonAtomic(join(resultDir, resultFile), cells);
    save("complete");
    return cells;
  } catch (error) {
    save("failed", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
