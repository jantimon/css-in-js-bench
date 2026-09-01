// Plumeria — multifile-composition. The SAME Tabs as the tabs case, with the styles and
// the Tab/Tabs primitives moved into this module and only the workload left in index.tsx.
// The style translation (dropped anchor-positioning underline, `fullWidth` threaded to the
// li/button instead of descendant selectors, explicit compound states) is identical to the
// tabs case — see its header for why.
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
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
interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, fullWidth, ...props }) => (
  <li role="presentation" classStyle={[styles.item, fullWidth && styles.itemFull]}>
    <button
      {...props}
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      classStyle={[styles.tab, isActive ? styles.active : styles.inactive, fullWidth && styles.tabFull]}
    />
  </li>
);

interface ITabsProps {
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} classStyle={styles.list}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} classStyle={styles.list}>
    {children}
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

export { Tab, Tabs, FullWidthTabs };
