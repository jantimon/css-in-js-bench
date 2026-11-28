// @ts-nocheck
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { createStyles } from "../../coulis";

// The same real-project Tabs in Coulis. Atomic rules are per element, so (as in the
// StyleX lane) the anchor-positioning underline is dropped for the per-tab ::after
// fallback, and the FullWidthTabs descendant selectors are applied to the li/button
// through a threaded `fullWidth` prop. Every style is static: class names are created
// once in the module scope and a render only picks strings.

const list = createStyles({
  position: "relative",
  whiteSpace: "nowrap",
  display: { base: "flex", scrollbar: "none" },
  flexWrap: "nowrap",
  overflowX: "auto",
  gap: 24,
  boxShadow: "inset 0 -1px 0 0 #ddd",
  margin: 0,
  padding: 0,
  listStyle: "none",
  scrollbarWidth: "none",
});

const itemBase = createStyles({ margin: 0, padding: 0, width: "min-content", flexShrink: 0, minWidth: 40 });
const item = `${itemBase} ${createStyles({ display: "block" })}`;
const itemFull = `${itemBase} ${createStyles({ flex: 1, display: "flex", justifyContent: "center" })}`;

const tabBase = createStyles({
  border: "none",
  position: { base: "relative", after: "absolute", before: "absolute" },
  display: "inline-flex",
  alignItems: "center",
  fontSize: { base: 16, desktop: 14 },
  lineHeight: { base: "24px", desktop: "20px" },
  letterSpacing: "0.01em",
  fontWeight: 400,
  backgroundColor: "transparent",
  height: { base: 40, before: "100%" },
  outline: { focusVisible: "none" },
  content: { after: "''", before: "''" },
  bottom: { after: 0, before: 0 },
  left: { after: 0 },
  right: { after: 0 },
  borderBottom: { after: "3px solid" },
  transition: { after: "opacity 150ms linear" },
  width: { before: "100%" },
  minWidth: { before: 40 },
  top: { before: 0 },
});
const inactive = `${tabBase} ${createStyles({
  color: { base: "rgba(0, 0, 0, 0.6)", hoverEnabled: "#000", disabled: "rgba(0, 0, 0, 0.26)" },
  cursor: { base: "pointer", disabled: "default" },
  borderBottomColor: { after: "transparent", afterHover: "#ddd", afterFocus: "#007bc7" },
})}`;
const active = `${tabBase} ${createStyles({
  color: "#000",
  borderBottomColor: { after: "#eeb524", afterFocus: "#007bc7" },
})}`;
const tabFull = createStyles({ flex: 1 });

interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, fullWidth, ...props }) => (
  <li role="presentation" className={fullWidth ? itemFull : item}>
    <button
      {...props}
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={fullWidth ? `${isActive ? active : inactive} ${tabFull}` : isActive ? active : inactive}
    />
  </li>
);

interface ITabsProps {
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} className={list}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} className={list}>
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
