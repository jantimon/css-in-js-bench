// Emotion — the real-project Tabs. Identical CSS to every other lane; the
// difference is the runtime: Emotion resolves these nested rules and injects CSS
// at render. Default-exports a single-instance render(i) (§6); the harness loops
// it. tabs builds ONE TabGroup from i (same formula as the old 150-group DATA
// array).
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";

// `$`-prefixed props are transient (the styled-components convention this shared template
// uses); emotion forwards every prop to the DOM by default, so strip them per component.
const transient = { shouldForwardProp: (p: string) => p[0] !== "$" };

// The SAME real-project Tabs expressed with styled-components: responsive copy
// typography, normal/active/hover/focus-visible/disabled states, an animated
// active underline via CSS anchor positioning (per-tab ::after fallback under
// @supports), a ::before WCAG 40px min-target, hidden-scrollbar overflow, and a
// composed FullWidthTabs wrapper. styled-components re-runs all of this through
// its runtime on every render. (The Emotion lane is derived from this file.)
const desktop = "@media (min-width: 992px)";

const copyTypography = css`
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0.01em;
  font-weight: 400;
  ${desktop} {
    font-size: 14px;
    line-height: 20px;
  }
`;

const normalTabStyle = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  ${copyTypography};
  cursor: pointer;
  color: rgba(0, 0, 0, 0.6);
  background-color: transparent;
  height: 40px;

  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    border-bottom: 3px solid transparent;
    transition: opacity 150ms linear;
  }

  &::before {
    position: absolute;
    content: "";
    width: 100%;
    min-width: 40px;
    top: 0;
    bottom: 0;
    height: 100%;
  }
`;

const activeTabStyle = css`
  color: #000;

  @supports (anchor-name: --test) {
    anchor-name: --active-tab;
  }

  &::after {
    border-bottom-color: #eeb524;

    @supports (anchor-name: --test) {
      border-bottom-color: #ddd;
      opacity: 0;
    }
  }
`;

const hoverTabStyle = css`
  color: #000;

  &::after {
    border-bottom-color: #ddd;
  }
`;

const focusVisibleTabStyle = css`
  outline: none;

  &&::after {
    border-bottom: 3px solid #007bc7;
  }
`;

const disabledTabStyle = css`
  color: rgba(0, 0, 0, 0.26);
  cursor: default;
`;

interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
}

const TabListItem = styled("li", transient)`
  display: block;
  margin: 0;
  padding: 0;
  width: min-content;
  flex-shrink: 0;
  min-width: 40px;
`;

const TabInternal = ({ isActive, disabled, ...props }: ITabProps) => (
  <TabListItem role="presentation">
    <button
      {...props}
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
    />
  </TabListItem>
);

const Tab = styled(TabInternal, transient)<ITabProps>`
  border-style: none;

  ${normalTabStyle};
  &:focus-visible {
    ${focusVisibleTabStyle};
  }
  ${({ isActive }) =>
    isActive
      ? css`
          ${activeTabStyle};
        `
      : css`
          &:hover:not(:disabled) {
            ${hoverTabStyle};
          }

          &:disabled {
            ${disabledTabStyle};
          }
        `}
`;

const TabList = styled("ul", transient)`
  position: relative;
  white-space: nowrap;
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 24px;
  box-shadow: inset 0 -1px 0 0 #ddd;
  margin: 0;
  padding: 0;
  list-style: none;

  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @supports (anchor-name: --test) {
    &::before {
      content: "";
      position: absolute;
      bottom: 0;
      position-anchor: --active-tab;
      left: anchor(left);
      right: anchor(right);
      height: 3px;
      background-color: #eeb524;
      transition:
        left 150ms ease-out,
        right 150ms ease-out;
    }
  }
`;

interface ITabsProps {
  className?: string;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <TabList role="tablist" onKeyDown={handleKeyDown} className={className}>
    {children}
  </TabList>
);

const FullWidthTabs = styled(Tabs, transient)`
  & > li {
    flex: 1;
    display: flex;
    justify-content: center;
  }
  & button {
    flex: 1;
  }
`;

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
  const group: Group = {
    id: i,
    count,
    activeIdx: i % count,
    fullWidth: i % 3 === 0,
    disabledIdx: i % 4 === 0 ? count - 1 : -1,
  };
  return group.fullWidth ? <FullWidthTabGroup group={group} /> : <TabGroup group={group} />;
};
