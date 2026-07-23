// vanilla lane — hand-written ceiling for a Tabs GROUP. The tab states collapse to a
// couple of literal class names over author-written CSS (./styles.css): no library, no
// runtime merge, no per-render work — the speed-of-light reference. Default-exports a
// single-instance render(i) (§6); the harness loops it. Sub-components, helpers and the
// per-group data formula are verbatim from the original vanilla tabs lane.
import React, { type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";

interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, children }) => {
  let c = "tab";
  if (isActive) c += " tab-active";
  else if (disabled) c += " tab-disabled";
  return (
    <li role="presentation" className="tab-item">
      <button
        type="button"
        role="tab"
        disabled={disabled}
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        className={c}
      >
        {children}
      </button>
    </li>
  );
};

interface ITabsProps {
  className?: string;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} className={className ? "tablist " + className : "tablist"}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <Tabs className={className ? "tablist-full " + className : "tablist-full"}>{children}</Tabs>
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

export { Tab, Tabs, FullWidthTabs };
