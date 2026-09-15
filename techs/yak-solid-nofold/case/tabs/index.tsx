import { omit } from "solid-js";
import type { JSX } from "@solidjs/web";
import { css, styled } from "@yak/solid";

// Port of a real-project Tabs component (galaxus design system). Exercises the
// hardest CSS this suite has: responsive copy typography, normal/active/hover/
// focus-visible/disabled states, an animated active underline via CSS anchor
// positioning (with a per-tab ::after fallback under @supports), a ::before WCAG
// 40px min-target-size, hidden-scrollbar horizontal overflow, and a composed
// FullWidthTabs wrapper. yak compiles ALL of it to build-time CSS; at
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

interface ITabProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
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

// Solid components run once and read props lazily, so the props object is passed
// along instead of destructured; `omit` keeps `isActive` off the DOM element.
const TabInternal = (props: ITabProps) => (
  <TabListItem role="presentation">
    <button
      {...omit(props, "isActive")}
      type="button"
      role="tab"
      disabled={props.disabled}
      aria-selected={props.isActive ? "true" : "false"}
      tabindex={props.isActive ? 0 : -1}
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
  class?: string;
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <TabList role="tablist" onKeyDown={handleKeyDown} class={props.class}>
    {props.children}
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
// `group={group()}` would rebuild the object on every read of it. `disabled` is computed
// by a call rather than written as `&&` inline, because the compiler wraps a logical
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

export default (g: () => number) => {
  // Cached on the index: the accessor is read many times per render and the formula is
  // the same every time, so rebuilding the object per read would be pure waste.
  let last = NaN;
  let cached!: Group;
  const group = (): Group => {
    const n = g();
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
  return <>{group().fullWidth ? <FullWidthTabGroup group={group} /> : <TabGroup group={group} />}</>;
};
