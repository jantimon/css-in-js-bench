// bench-strategy: same-as-tabs-multifile
import { Tab, Tabs, FullWidthTabs } from "./parts";

// --- workload ----------------------------------------------------------------
const LABELS = ["Overview", "Specs", "Reviews", "Q&A", "Similar", "Deals", "Support", "More"];
interface Group { id: number; count: number; activeIdx: number; fullWidth: boolean; disabledIdx: number; }

const TabGroup = ({ group }: { group: Group }) => (
  <Tabs>
    {Array.from({ length: group.count }, (_, t) => (
      <Tab
        key={t}
        isActive={t === group.activeIdx}
        disabled={t === group.disabledIdx && t !== group.activeIdx}
      >
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </Tabs>
);

const FullWidthTabGroup = ({ group }: { group: Group }) => (
  <FullWidthTabs>
    {Array.from({ length: group.count }, (_, t) => (
      <Tab
        key={t}
        isActive={t === group.activeIdx}
        disabled={t === group.disabledIdx && t !== group.activeIdx}
      >
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </FullWidthTabs>
);

export default (i: number) => {
  const count = 3 + (i % 6);
  const group: Group = {
    id: i,
    count,
    activeIdx: i % count,
    fullWidth: i % 3 === 0,
    disabledIdx: i % 4 === 0 ? count - 1 : -1,
  };
  return group.fullWidth ? <FullWidthTabGroup group={group} /> : <TabGroup group={group} />;
};
