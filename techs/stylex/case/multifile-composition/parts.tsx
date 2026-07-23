// @ts-nocheck
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";

// The same real-project Tabs in StyleX. StyleX is atomic-per-element, so two
// styled-components features can't be expressed and are intentionally dropped:
//   • the CSS anchor-positioning animated underline (@supports anchor-name) — a
//     progressive enhancement the styled version itself guards behind @supports;
//     the StyleX lane renders the per-tab ::after underline fallback (the path
//     every shipping browser uses today).
//   • descendant selectors (FullWidthTabs' `& > li`, `& button`) — applied
//     directly to the li/button via a threaded `fullWidth` style instead.
// Everything else (normal/active/hover/focus-visible/disabled states, the ::after
// underline, the ::before 40px target, responsive copy typography, hidden-scrollbar
// overflow, roving-tabindex keyboard nav) is faithful.
const desktop = "@media (min-width: 992px)";

const styles = stylex.create({
  list: {
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
  },
  item: {
    display: "block",
    margin: 0,
    padding: 0,
    width: "min-content",
    flexShrink: 0,
    minWidth: "40px",
  },
  itemFull: { flex: 1, display: "flex", justifyContent: "center" },
  tab: {
    borderStyle: "none",
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    fontSize: { default: "16px", [desktop]: "14px" },
    lineHeight: { default: "24px", [desktop]: "20px" },
    letterSpacing: "0.01em",
    fontWeight: 400,
    backgroundColor: "transparent",
    height: "40px",
    outline: { default: null, ":focus-visible": "none" },
    "::after": {
      content: "''",
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      borderBottomWidth: "3px",
      borderBottomStyle: "solid",
      transition: "opacity 150ms linear",
    },
    "::before": {
      content: "''",
      position: "absolute",
      width: "100%",
      minWidth: "40px",
      top: 0,
      bottom: 0,
      height: "100%",
    },
  },
  inactive: {
    color: { default: "rgba(0, 0, 0, 0.6)", ":hover:not(:disabled)": "#000", ":disabled": "rgba(0, 0, 0, 0.26)" },
    cursor: { default: "pointer", ":disabled": "default" },
    "::after": {
      borderBottomColor: { default: "transparent", ":hover:not(:disabled)": "#ddd", ":focus-visible": "#007bc7" },
    },
  },
  active: {
    color: "#000",
    "::after": { borderBottomColor: { default: "#eeb524", ":focus-visible": "#007bc7" } },
  },
  tabFull: { flex: 1 },
});

interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, fullWidth, ...props }) => (
  <li role="presentation" {...stylex.props(styles.item, fullWidth && styles.itemFull)}>
    <button
      {...props}
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      {...stylex.props(styles.tab, isActive ? styles.active : styles.inactive, fullWidth && styles.tabFull)}
    />
  </li>
);

interface ITabsProps {
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} {...stylex.props(styles.list)}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} {...stylex.props(styles.list)}>
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
