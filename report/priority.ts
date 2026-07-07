// Editorial ordering of cases/sections — the layer that used to be `tier`/`group`
// ordering, now owned entirely by the report (§10.8). A case absent from this map
// gets priority 0; the report sorts by priority DESC, then alphabetically. Higher =
// earlier (lead with the most realistic, whole-screen cases).
export const CASE_PRIORITY: Record<string, number> = {
  "product-grid": 100,
  "realistic-button": 90,
  tabs: 80,
};
