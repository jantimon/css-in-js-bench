// @ts-nocheck
import React, { type ButtonHTMLAttributes, type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { styled } from "styled-system/jsx";

// Panda CSS style-props (JSX factory) port of the real-project Tabs component
// (galaxus design system). Renders pixel-identically to the next-yak version:
// responsive copy typography, normal/active/hover/focus-visible/disabled states,
// an animated active underline via CSS anchor positioning (per-tab ::after
// fallback under @supports), a ::before WCAG 40px min-target, hidden-scrollbar
// overflow, and a full-width variant (threaded down as a prop). Instead of css()
// className strings every host element is a `<styled.tag>` from styled-system/jsx.
// Panda 2.x style props accept only plain CSS properties — conditions, selectors
// and at-rules go through the `css` prop — so each element spreads its flat style
// objects DIRECTLY and passes the nested rules via css={[...]} (arrays of static
// module consts, statically analyzable so `panda cssgen` can scan this file);
// active-vs-inactive is expressed by choosing between static style objects at the
// call site.

// --- style objects (mirror the yak template's css blocks verbatim) ----------

// font-size/line-height/letter-spacing/font-weight + desktop @media override.
const copyTypography = {
  fontSize: "16px",
  lineHeight: "24px",
  letterSpacing: "0.01em",
  fontWeight: "400",
} as const;

const copyTypographyCss = {
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
} as const;

const normalTabCss = {
  ...copyTypographyCss,

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
} as const;

const activeTabStyle = {
  color: "#000",
} as const;

const activeTabCss = {
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
} as const;

const hoverDisabledTabCss = {
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
} as const;

const focusVisibleTabCss = {
  _focusVisible: {
    outline: "none",
    "&&::after": {
      borderBottom: "3px solid #007bc7",
    },
  },
} as const;

const tabBaseStyle = {
  borderStyle: "none",
} as const;

interface ITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  disabled?: boolean;
}

const tabListItemStyle = {
  display: "block",
  margin: "0",
  padding: "0",
  width: "min-content",
  flexShrink: "0",
  minWidth: "40px",
} as const;

// Panda's JSX extraction only reads style props it can resolve STATICALLY: literal spreads of
// module-const objects on a <styled.tag>, or a css={[...]} array of module consts. Merging the
// style objects into a runtime `className` object and spreading THAT (`{...className}`) is a
// shape cssgen can't read — so none of the tab's own rules (height, letter-spacing, the active
// underline) would reach panda.css and the buttons render unstyled. Here every flat style object
// is spread DIRECTLY and the nested rules ride the css prop, and active-vs-inactive is picked by
// choosing the element, so each branch is fully static and extractable.
// `fullWidth` is threaded down + applied via ternary prop values (also static) so each <li>/
// <button> stretches ITSELF, instead of the parent <ul> reaching children via a `& > li`
// descendant selector. Both `fullWidth` and `isActive` are destructured out so they never land
// on the DOM as attributes.
const Tab = ({ isActive, disabled, fullWidth, ...props }: ITabProps & { fullWidth?: boolean }) => (
  <styled.li
    role="presentation"
    {...tabListItemStyle}
    display={fullWidth ? "flex" : "block"}
    flex={fullWidth ? "1" : undefined}
    justifyContent={fullWidth ? "center" : undefined}
  >
    {isActive ? (
      <styled.button
        {...props}
        type="button"
        role="tab"
        disabled={disabled}
        aria-selected={true}
        tabIndex={0}
        flex={fullWidth ? "1" : undefined}
        {...tabBaseStyle}
        {...normalTabStyle}
        {...activeTabStyle}
        css={[normalTabCss, focusVisibleTabCss, activeTabCss]}
      />
    ) : (
      <styled.button
        {...props}
        type="button"
        role="tab"
        disabled={disabled}
        aria-selected={false}
        tabIndex={-1}
        flex={fullWidth ? "1" : undefined}
        {...tabBaseStyle}
        {...normalTabStyle}
        css={[normalTabCss, focusVisibleTabCss, hoverDisabledTabCss]}
      />
    )}
  </styled.li>
);

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
} as const;

const tabListCss = {
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
} as const;

interface ITabsProps {
  className?: Record<string, unknown>;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <styled.ul role="tablist" onKeyDown={handleKeyDown} {...tabListStyle} css={tabListCss} {...className}>
    {children}
  </styled.ul>
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
  <Tabs>
    {Array.from({ length: group.count }, (_, t) => (
      <Tab
        key={t}
        isActive={t === group.activeIdx}
        disabled={t === group.disabledIdx && t !== group.activeIdx}
        fullWidth
      >
        {LABELS[t % LABELS.length]}
      </Tab>
    ))}
  </Tabs>
);

export default (i: number) => {
  const count = 3 + (i % 6);
  const g: Group = { id: i, count, activeIdx: i % count, fullWidth: i % 3 === 0, disabledIdx: i % 4 === 0 ? count - 1 : -1 };
  return g.fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />;
};
