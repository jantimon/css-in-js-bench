// vanilla-solid lane — hand-written ceiling for a Tabs GROUP. The tab states collapse to
// a couple of literal class names over author-written CSS (./styles.css): no library, no
// runtime merge, no per-render work — the speed-of-light reference for Solid.
import type { JSX } from "@solidjs/web";

interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: JSX.Element;
}

const Tab = (props: ITabProps) => {
  const cls = () => {
    let c = "tab";
    if (props.isActive) c += " tab-active";
    else if (props.disabled) c += " tab-disabled";
    return c;
  };
  return (
    <li role="presentation" class="tab-item">
      <button
        type="button"
        role="tab"
        disabled={props.disabled}
        aria-selected={props.isActive ? "true" : "false"}
        tabindex={props.isActive ? 0 : -1}
        class={cls()}
      >
        {props.children}
      </button>
    </li>
  );
};

interface ITabsProps {
  class?: string;
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} class={props.class ? "tablist " + props.class : "tablist"}>
    {props.children}
  </ul>
);

const FullWidthTabs = (props: ITabsProps) => (
  <Tabs class={props.class ? "tablist-full " + props.class : "tablist-full"}>{props.children}</Tabs>
);

// --- keyboard navigation (roving tabindex) ----------------------------------
const queryTab = (el: Element | null | undefined) =>
  el?.querySelector("button") ?? null;
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
function handleKeyDown(event: KeyboardEvent & { currentTarget: HTMLUListElement }) {
  const node = event.currentTarget;
  switch (event.key) {
    case "ArrowRight": nextTab(node); break;
    case "ArrowLeft": prevTab(node); break;
    case "Home": event.preventDefault(); firstTab(node); break;
    case "End": event.preventDefault(); lastTab(node); break;
  }
}

// --- workload ----------------------------------------------------------------
const LABELS = ["Overview", "Specs", "Reviews", "Q&A", "Similar", "Deals", "Support", "More"];
interface Group { id: number; count: number; activeIdx: number; fullWidth: boolean; disabledIdx: number; }

// The group arrives as an accessor: a dynamic JSX prop compiles to a getter, so
// `group={g()}` would rebuild the object on every read of it. `disabled` is computed by
// a call rather than written as `&&` inline, because the compiler wraps a logical
// expression in a prop position in a memo — a whole memo node per tab for a boolean.
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
      cached = {
        id: n,
        count,
        activeIdx: n % count,
        fullWidth: n % 3 === 0,
        disabledIdx: n % 4 === 0 ? count - 1 : -1,
      };
    }
    return cached;
  };
  return <>{g().fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />}</>;
};
