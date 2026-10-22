// bench-strategy: same-as-tabs-multifile
import { Tab, TabsContainer } from "./parts";

// --- workload ----------------------------------------------------------------
const LABELS = ["Overview", "Specs", "Reviews", "Q&A", "Similar", "Deals", "Support", "More"];
interface Group { id: number; count: number; activeIdx: number; fullWidth: boolean; disabledIdx: number; }

const TabGroup = ({ group }: { group: Group }) => (
  <TabsContainer fullWidth={false}>
    {Array.from({ length: group.count }, (_, t) => (
      <Tab key={t} isActive={t === group.activeIdx} disabled={t === group.disabledIdx && t !== group.activeIdx}>
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </TabsContainer>
);

const FullWidthTabGroup = ({ group }: { group: Group }) => (
  <TabsContainer fullWidth>
    {Array.from({ length: group.count }, (_, t) => (
      <Tab key={t} isActive={t === group.activeIdx} disabled={t === group.disabledIdx && t !== group.activeIdx}>
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </TabsContainer>
);

export default (g: number) => {
  const count = 3 + (g % 6);
  const group: Group = {
    id: g,
    count,
    activeIdx: g % count,
    fullWidth: g % 3 === 0,
    disabledIdx: g % 4 === 0 ? count - 1 : -1,
  };
  return group.fullWidth ? <FullWidthTabGroup group={group} /> : <TabGroup group={group} />;
};
