import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { css, styled } from "next-yak";

// Port of a real-project Tabs component (galaxus design system). Exercises the
// hardest CSS this suite has: responsive copy typography, normal/active/hover/
// focus-visible/disabled states, an animated active underline via CSS anchor
// positioning (with a per-tab ::after fallback under @supports), a ::before WCAG
// 40px min-target-size, hidden-scrollbar horizontal overflow, and a composed
// FullWidthTabs wrapper. next-yak compiles ALL of it to build-time CSS; at
// runtime it only flips the active class. The Tailwind lanes must ship a ~40-
// token utility list per tab and conflict-resolve it on every render.
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

const TabListItem = styled.li`
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

const Tab = styled(TabInternal)<ITabProps>`
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

const TabList = styled.ul`
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

// Equal-width children. Uses element/descendant selectors (not styled-component
// references) so every lane is byte-equivalent and yak needs no component-
// selector support.
const FullWidthTabs = styled(Tabs)`
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

export { Tab, Tabs, FullWidthTabs };
