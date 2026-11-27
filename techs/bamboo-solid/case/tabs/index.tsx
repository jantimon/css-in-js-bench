// @ts-nocheck
import type { JSX } from "@solidjs/web";
import { css, cx } from "styled-system/css";

// Bamboo Solid port of the real-project Tabs component: the Bamboo React lane's styles over
// the vanilla-solid lane's components and workload. Responsive copy typography,
// normal/active/hover/focus-visible/disabled states, an animated active underline via CSS
// anchor positioning (per-tab ::after fallback under @supports), a ::before WCAG 40px
// min-target, hidden-scrollbar overflow, and a composed FullWidthTabs wrapper. Every style
// object is static, so the compiler replaces each css()/cx() call with its class-string
// literal; active-vs-inactive picks between two precompiled strings.

// --- style objects (the Bamboo React lane's, verbatim) ----------------------

// font-size/line-height/letter-spacing/font-weight + desktop @media override.
const copyTypography = {
  fontSize: "16px",
  lineHeight: "24px",
  letterSpacing: "0.01em",
  fontWeight: "400",
  "@media (min-width: 992px)": {
    fontSize: "14px",
    lineHeight: "20px",
  },
} as const;

const normalTabStyle = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  ...copyTypography,
  cursor: "pointer",
  color: "rgba(0, 0, 0, 0.6)",
  backgroundColor: "transparent",
  height: "40px",

  _after: {
    content: '""',
    position: "absolute",
    bottom: "0",
    left: "0",
    right: "0",
    borderBottom: "3px solid transparent",
    transition: "opacity 150ms linear",
  },

  _before: {
    position: "absolute",
    content: '""',
    width: "100%",
    minWidth: "40px",
    top: "0",
    bottom: "0",
    height: "100%",
  },
};

const activeTabStyle = {
  color: "#000",

  "@supports (anchor-name: --test)": {
    "anchor-name": "--active-tab",
  },

  _after: {
    borderBottomColor: "#eeb524",

    "@supports (anchor-name: --test)": {
      borderBottomColor: "#ddd",
      opacity: "0",
    },
  },
};

const hoverDisabledTabStyle = {
  "&:hover:not(:disabled)": {
    color: "#000",
    _after: {
      borderBottomColor: "#ddd",
    },
  },
  "&:disabled": {
    color: "rgba(0, 0, 0, 0.26)",
    cursor: "default",
  },
};

const focusVisibleTabStyle = {
  _focusVisible: {
    outline: "none",
    "&&::after": {
      borderBottom: "3px solid #007bc7",
    },
  },
};

const tabBaseStyle = {
  borderStyle: "none",
};

const tabListItemStyle = {
  display: "block",
  margin: "0",
  padding: "0",
  width: "min-content",
  flexShrink: "0",
  minWidth: "40px",
};

const tabListStyle = {
  position: "relative",
  whiteSpace: "nowrap",
  display: "flex",
  flexWrap: "nowrap",
  overflowX: "auto",
  gap: "24px",
  boxShadow: "inset 0 -1px 0 0 #ddd",
  margin: "0",
  padding: "0",
  listStyle: "none",

  scrollbarWidth: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },

  "@supports (anchor-name: --test)": {
    _before: {
      content: '""',
      position: "absolute",
      bottom: "0",
      "position-anchor": "--active-tab",
      left: "anchor(left)",
      right: "anchor(right)",
      height: "3px",
      backgroundColor: "#eeb524",
      transition: "left 150ms ease-out, right 150ms ease-out",
    },
  },
};

// Equal-width children. Uses element/descendant selectors (not component refs) so
// every lane is byte-equivalent in structure.
const fullWidthTabsStyle = {
  "& > li": {
    flex: "1",
    display: "flex",
    justifyContent: "center",
  },
  "& button": {
    flex: "1",
  },
};

// --- components (the vanilla-solid lane's) ---------------------------------

interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: JSX.Element;
}

const Tab = (props: ITabProps) => (
  <li role="presentation" class={css(tabListItemStyle)}>
    <button
      type="button"
      role="tab"
      disabled={props.disabled}
      aria-selected={props.isActive ? "true" : "false"}
      tabindex={props.isActive ? 0 : -1}
      class={cx(
        css(tabBaseStyle),
        css(normalTabStyle),
        css(focusVisibleTabStyle),
        props.isActive ? css(activeTabStyle) : css(hoverDisabledTabStyle),
      )}
    >
      {props.children}
    </button>
  </li>
);

interface ITabsProps {
  class?: string;
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} class={cx(css(tabListStyle), props.class)}>
    {props.children}
  </ul>
);

const FullWidthTabs = (props: ITabsProps) => (
  <Tabs class={cx(css(fullWidthTabsStyle), props.class)}>{props.children}</Tabs>
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

// --- workload (the vanilla-solid lane's) ------------------------------------
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
  // ONE tab group built from i with the same per-group formula as every other lane,
  // cached on the index as in the vanilla-solid lane.
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
