import test from "node:test";
import assert from "node:assert/strict";
import { LANES, parseWpdArgs, runLanesSequentially } from "./run-wpd.mjs";

test("defaults to the fixed six-lane order", () => assert.deepEqual(parseWpdArgs([]).lanes, LANES));
test("parses filters and lane lists", () => assert.deepEqual(parseWpdArgs(["--lane=inp,blame", "--tech", "yak*", "--case=x"]), { lanes: ["inp", "blame"], tech: "yak*", caseId: "x" }));
test("rejects unknown lanes", () => assert.throws(() => parseWpdArgs(["--lane=nope"]), /unknown/));
test("stops after the first failed lane", async () => {
  const seen = [];
  await assert.rejects(runLanesSequentially(["ssr", "mount", "inp"], async (lane) => { seen.push(lane); if (lane === "mount") throw new Error("stop"); }));
  assert.deepEqual(seen, ["ssr", "mount"]);
});
