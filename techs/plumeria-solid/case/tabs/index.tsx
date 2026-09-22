// Like the StyleX lane, this uses the per-tab underline fallback and threads full-width
// styles to the li/button because Plumeria does not support descendant selectors.
// Compound states are explicit because simultaneous pseudo-classes are not inferred.
import type { JSX } from "@solidjs/web";
import * as css from "@plumeria/core";

const desktop = "@media (min-width: 992px)";

const styles = css.create({
  list: {
    position: "relative",
    display: "flex",
    flexWrap: "nowrap",
    gap: 24,
    padding: 0,
    margin: 0,
    overflowX: "auto",
    whiteSpace: "nowrap",
    listStyle: "none",
    scrollbarWidth: "none",
    boxShadow: "inset 0 -1px 0 0 #ddd"
  },
  item: {
    display: "block",
    flexShrink: 0,
    width: "min-content",
    minWidth: 40,
    padding: 0,
    margin: 0
  },
  itemFull: {
    display: "flex",
    flex: 1,
    justifyContent: "center"
  },
  tab: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    height: 40,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: "24px",
    letterSpacing: "0.01em",
    backgroundColor: "transparent",
    borderStyle: "none",
    [desktop]: {
      fontSize: 14,
      lineHeight: "20px"
    },
    ":focus-visible": {
      outline: "none"
    },
    "::after": {
      position: "absolute",
      right: 0,
      bottom: 0,
      left: 0,
      content: '""',
      borderBottomStyle: "solid",
      borderBottomWidth: 3,
      transition: "opacity 150ms linear"
    },
    "::before": {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: "100%",
      minWidth: 40,
      height: "100%",
      content: '""'
    }
  },
  inactive: {
    color: "rgba(0, 0, 0, 0.6)",
    cursor: "pointer",
    ":hover:not(:disabled)": {
      color: "#000"
    },
    ":disabled": {
      color: "rgba(0, 0, 0, 0.26)",
      cursor: "default"
    },
    "::after": {
      borderBottomColor: "transparent"
    },
    ":hover:not(:disabled)::after": {
      borderBottomColor: "#ddd"
    },
    ":focus-visible::after": {
      borderBottomColor: "#007bc7"
    },
  },
  active: {
    color: "#000",
    "::after": {
      borderBottomColor: "#eeb524"
    },
    ":focus-visible::after": {
      borderBottomColor: "#007bc7"
    },
  },
  tabFull: {
    flex: 1
  },
});

const LABELS = ["Overview", "Specs", "Reviews", "Q&A", "Similar", "Deals", "Support", "More"];
interface Group { id: number; count: number; activeIdx: number; fullWidth: boolean; disabledIdx: number; }
interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children?: JSX.Element;
}

// aria-selected is written as an explicit string: React serializes a boolean attribute
// value, Solid would emit the attribute bare.
const Tab = (props: ITabProps) => (
  <li role="presentation" classStyle={[styles.item, props.fullWidth && styles.itemFull]}>
    <button
      type="button"
      role="tab"
      disabled={props.disabled}
      aria-selected={props.isActive ? "true" : "false"}
      tabindex={props.isActive ? 0 : -1}
      classStyle={[styles.tab, props.isActive ? styles.active : styles.inactive, props.fullWidth && styles.tabFull]}
    >
      {props.children}
    </button>
  </li>
);

interface ITabsProps {
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} classStyle={styles.list}>
    {props.children}
  </ul>
);

const FullWidthTabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} classStyle={styles.list}>
    {props.children}
  </ul>
);

// roving-tabindex keyboard navigation (identical behaviour to the styled lane)
const queryTab = (el: Element | null | undefined) => el?.querySelector("button") ?? null;
const firstTab = (list: HTMLUListElement) => queryTab(list.firstElementChild)?.focus();
const lastTab = (list: HTMLUListElement) => queryTab(list.lastElementChild)?.focus();
const nextTab = (list: HTMLUListElement) => {
  const n = queryTab(document.activeElement?.parentElement?.nextElementSibling);
  n ? n.focus() : firstTab(list);
};
const prevTab = (list: HTMLUListElement) => {
  const p = queryTab(document.activeElement?.parentElement?.previousElementSibling);
  p ? p.focus() : lastTab(list);
};
function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
  const node = event.currentTarget;
  switch (event.key) {
    case "ArrowRight": nextTab(node); break;
    case "ArrowLeft": prevTab(node); break;
    case "Home": event.preventDefault(); firstTab(node); break;
    case "End": event.preventDefault(); lastTab(node); break;
  }
}

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
