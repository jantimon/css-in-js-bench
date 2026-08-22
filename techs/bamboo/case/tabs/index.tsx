// @ts-nocheck
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { css, cx } from "styled-system/css";

// Bamboo port of the real-project Tabs component (galaxus design system).
// Renders pixel-identically to the next-yak version: responsive copy typography,
// normal/active/hover/focus-visible/disabled states, an animated active underline
// via CSS anchor positioning (per-tab ::after fallback under @supports), a
// ::before WCAG 40px min-target, hidden-scrollbar overflow, and a composed
// FullWidthTabs wrapper. Every `css({...})` object is statically analyzable, so
// the compiler replaces each call with its class-string literal; active-vs-
// inactive picks between those precompiled strings at the call site via cx().

// --- style objects (mirror the yak template's css blocks verbatim) ----------

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

const normalTabStyle = css({
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
});

const activeTabStyle = css({
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
});

const hoverDisabledTabStyle = css({
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
});

const focusVisibleTabStyle = css({
  _focusVisible: {
    outline: "none",
    "&&::after": {
      borderBottom: "3px solid #007bc7",
    },
  },
});

const tabBaseStyle = css({
  borderStyle: "none",
});

interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
}

const tabListItemStyle = css({
  display: "block",
  margin: "0",
  padding: "0",
  width: "min-content",
  flexShrink: "0",
  minWidth: "40px",
});

const TabInternal = ({ isActive, disabled, className, ...props }: ITabProps) => (
  <li role="presentation" className={tabListItemStyle}>
    <button
      {...props}
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={className}
    />
  </li>
);

const Tab = ({ isActive, ...props }: ITabProps) => (
  <TabInternal
    {...props}
    isActive={isActive}
    className={cx(
      tabBaseStyle,
      normalTabStyle,
      focusVisibleTabStyle,
      isActive ? activeTabStyle : hoverDisabledTabStyle,
    )}
  />
);

const tabListStyle = css({
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
});

// Equal-width children. Uses element/descendant selectors (not component refs) so
// every lane is byte-equivalent in structure.
const fullWidthTabsStyle = css({
  "& > li": {
    flex: "1",
    display: "flex",
    justifyContent: "center",
  },
  "& button": {
    flex: "1",
  },
});

interface ITabsProps {
  className?: string;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} className={cx(tabListStyle, className)}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <Tabs className={cx(fullWidthTabsStyle, className)}>{children}</Tabs>
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
function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
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
