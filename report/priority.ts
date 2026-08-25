// Editorial ordering of cases/sections — the layer that used to be `tier`/`group`
// ordering, now owned entirely by the report (§10.8). A case absent from this map
// gets priority 0; the report sorts by priority DESC, then alphabetically. Higher =
// earlier (lead with the most realistic, whole-screen cases).
export const CASE_PRIORITY: Record<string, number> = {
  "product-grid": 100,
  // the product-grid A/B: the same page split across five modules, so no fold sees both a
  // declaration and its use site.
  "multifile-shop": 95,
  "realistic-button": 90,
  // the API-shape pair: the same variant ladder, once as style values merged at one
  // element and once as a chain of wrapper components. Both split across three modules.
  "button-variants": 85,
  "button-variants-nested": 84,
  tabs: 80,
  // experiment pairs read together: multifile is the tabs A/B, the dyn trio brackets
  // the dynamic-value mechanisms (naive → best-practice → inline control).
  "multifile-composition": 75,
  "dyn-translate": 60,
  "dyn-fair": 55,
  "dyn-inline": 50,
};
