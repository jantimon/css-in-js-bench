import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWpdResults } from "../report/wpd-results.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = validateWpdResults(join(root, "result"), { finalize: process.argv.includes("--finalize") });
console.log(`WPD ${manifest.wpd.version}: ${manifest.expectedCells} cells × 6 lanes validated${manifest.complete ? " and complete" : ""}.`);
