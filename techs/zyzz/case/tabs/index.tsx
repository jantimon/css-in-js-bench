import React, { type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { style } from "../../zyzz.config";

// The same real-project Tabs in Zyzz, including the CSS anchor-positioning underline under
// @supports. The active and disabled states read the attributes the button already
// exposes (aria-selected, :disabled), so a tab applies one style. FullWidthTabs marks its
// list with an empty style, and the item and tab rules select on that ancestor.
interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, children }) => (
  <li role="presentation" {...styles.item()}>
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      {...styles.tab()}
    >
      {children}
    </button>
  </li>
);

interface ITabsProps {
  className?: string | undefined;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} {...styles.list({ className })}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <Tabs {...styles.listFull({ className })}>{children}</Tabs>
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
  const g: Group = { id: i, count, activeIdx: i % count, fullWidth: i % 3 === 0, disabledIdx: i % 4 === 0 ? count - 1 : -1 };
  return g.fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />;
};

namespace styles {
  export const list = style({
    position: "relative",
    whiteSpace: "nowrap",
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: "24px",
    boxShadow: "inset 0 -1px 0 0 #ddd",
    margin: 0,
    padding: 0,
    listStyle: "none",
    scrollbarWidth: "none",
    "::-webkit-scrollbar": { display: "none" },
    "@supports (anchor-name: --test)": {
      "::before": {
        content: '""',
        position: "absolute",
        bottom: 0,
        positionAnchor: "--active-tab",
        left: "anchor(left)",
        right: "anchor(right)",
        height: "3px",
        backgroundColor: "#eeb524",
        transition: "left 150ms ease-out, right 150ms ease-out",
      },
    },
  });

  // Marks a full-width list; the item and tab rules below select on it.
  export const listFull = style();

  export const item = style({
    display: "block",
    margin: 0,
    padding: 0,
    width: "min-content",
    flexShrink: 0,
    minWidth: "40px",
    selectors: {
      [`${listFull} > &`]: { flex: 1, display: "flex", justifyContent: "center" },
    },
  });

  // Active rules come before :focus-visible, which wins at equal specificity.
  export const tab = style({
    borderStyle: "none",
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    fontSize: "16px",
    lineHeight: "24px",
    letterSpacing: "0.01em",
    fontWeight: 400,
    cursor: "pointer",
    color: "rgba(0, 0, 0, 0.6)",
    backgroundColor: "transparent",
    height: "40px",
    "@media (min-width: 992px)": { fontSize: "14px", lineHeight: "20px" },
    "::after": {
      content: '""',
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      borderBottom: "3px solid transparent",
      transition: "opacity 150ms linear",
    },
    "::before": {
      position: "absolute",
      content: '""',
      width: "100%",
      minWidth: "40px",
      top: 0,
      bottom: 0,
      height: "100%",
    },
    selectors: {
      '&[aria-selected="true"]': { color: "#000" },
      '&[aria-selected="true"]::after': { borderBottomColor: "#eeb524" },
      '&:not([aria-selected="true"]):hover:not(:disabled)': { color: "#000" },
      '&:not([aria-selected="true"]):hover:not(:disabled)::after': { borderBottomColor: "#ddd" },
      '&:not([aria-selected="true"]):disabled': { color: "rgba(0, 0, 0, 0.26)", cursor: "default" },
      [`${listFull} &`]: { flex: 1 },
    },
    "@supports (anchor-name: --test)": {
      selectors: {
        '&[aria-selected="true"]': { anchorName: "--active-tab" },
        '&[aria-selected="true"]::after': { borderBottomColor: "#ddd", opacity: 0 },
      },
    },
    ":focus-visible": {
      outline: "none",
      "::after": { borderBottom: "3px solid #007bc7" },
    },
  });
}
