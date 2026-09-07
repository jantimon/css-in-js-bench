import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WPD_LANES, validateWpdResults } from "../report/wpd-results.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = validateWpdResults(resolve(process.env.WPD_RESULT_DIR ?? join(root, "result")), { finalize: process.argv.includes("--finalize") });
console.log(`WPD ${manifest.wpd.version}: ${manifest.expectedCells} cells × ${WPD_LANES.length} lanes validated${manifest.complete ? " and complete" : ""}.`);
