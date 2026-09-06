import test from "node:test";
import assert from "node:assert/strict";
import { interactionTimings, interactionProfiles, hasInteractionProvenance } from "./interaction.ts";
import { INTERACTION_PROTOCOL, type WpdBrowserSample } from "./types.ts";

test("interaction timings require the shared transition and valid samples", () => {
  assert.deepEqual(interactionTimings({
    valid: { protocol: INTERACTION_PROTOCOL, samples: [1, 2, 3] },
    untagged: [1, 2, 3],
    different: { protocol: "different-input", samples: [1] },
    empty: { protocol: INTERACTION_PROTOCOL, samples: [] },
    invalid: { protocol: INTERACTION_PROTOCOL, samples: [null] },
  }), { valid: [1, 2, 3] });
});

test("interaction profiles require the same transition as the timing bars", () => {
  const profile: WpdBrowserSample = { span: null, runSpan: null, timing: { wallMs: null, perIteration: [], stats: null } };
  const valid = { ...profile, interactionProtocol: INTERACTION_PROTOCOL };
  assert.deepEqual(interactionProfiles({ valid: [valid], untagged: [profile], empty: [] }), { valid: [valid] });
});

test("case and study prose require matching interaction provenance", () => {
  assert.equal(hasInteractionProvenance(null), false);
  assert.equal(hasInteractionProvenance({ provenance: {} }), false);
  assert.equal(hasInteractionProvenance({ provenance: { interactionProtocol: "different-input" } }), false);
  assert.equal(hasInteractionProvenance({ provenance: { interactionProtocol: INTERACTION_PROTOCOL } }), true);
});
