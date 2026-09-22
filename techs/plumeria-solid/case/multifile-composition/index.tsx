// bench-strategy: same-as-tabs-multifile
// Plumeria on Solid — multifile-composition. The tabs case with its styles and its
// primitives split into parts.tsx: same DOM, same CSS, same 150 groups. What the case
// prices is the file boundary: `classStyle` resolves to a literal class attribute here
// the same way it does when the `css.create` it reads sits in the same module.
import { Tab, Tabs, FullWidthTabs } from "./parts";

const LABELS = ["Overview", "Specs", "Reviews", "Q&A", "Similar", "Deals", "Support", "More"];
interface Group { id: number; count: number; activeIdx: number; fullWidth: boolean; disabledIdx: number; }

const isDisabled = (g: Group, t: number) => t === g.disabledIdx && t !== g.activeIdx;


const TabGroup = (props: { group: () => Group }) => (
  <Tabs>
    {Array.from({ length: props.group().count }, (_, t) => (
      <Tab
        isActive={t === props.group().activeIdx}
        disabled={isDisabled(props.group(), t)}
      >
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </Tabs>
);

const FullWidthTabGroup = (props: { group: () => Group }) => (
  <FullWidthTabs>
    {Array.from({ length: props.group().count }, (_, t) => (
      <Tab
        isActive={t === props.group().activeIdx}
        disabled={isDisabled(props.group(), t)}
        fullWidth
      >
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </FullWidthTabs>
);

export default (i: () => number) => {
  // ONE tab group built from i with the same per-group formula as every other lane.
  // Cached on the index: the accessor is read many times per render and the formula is
  // the same every time, so rebuilding the object per read would be pure waste.
  let last = NaN;
  let cached!: Group;
  const g = (): Group => {
    const n = i();
    if (n !== last) {
      last = n;
      const count = 3 + (n % 6);
      cached = { id: n, count, activeIdx: n % count, fullWidth: n % 3 === 0, disabledIdx: n % 4 === 0 ? count - 1 : -1 };
    }
    return cached;
  };
  return <>{g().fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />}</>;
};
