import { INTERACTION_PROTOCOL, type InteractionSamples, type WpdBrowserSample } from "./types.ts";

export function hasInteractionProvenance(analysis: { provenance?: { interactionProtocol?: string } } | null): boolean {
  return analysis?.provenance?.interactionProtocol === INTERACTION_PROTOCOL;
}

// Interaction charts require samples of the same input transition and cache setup.
export function interactionTimings(data: Record<string, unknown>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(data)) {
    const row = value as Partial<InteractionSamples> | null;
    if (row?.protocol === INTERACTION_PROTOCOL && Array.isArray(row.samples) && row.samples.length &&
        row.samples.every((ms) => Number.isFinite(ms) && ms >= 0)) out[key] = row.samples;
  }
  return out;
}

export function interactionProfiles(data: Record<string, WpdBrowserSample[]>): Record<string, WpdBrowserSample[]> {
  return Object.fromEntries(Object.entries(data).filter(([, rows]) =>
    rows?.[0]?.interactionProtocol === INTERACTION_PROTOCOL));
}
