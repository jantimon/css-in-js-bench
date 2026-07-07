// cnfast — a real-project Tabs GROUP expressed as Tailwind utilities, resolved by
// cnfast's cn(). Every feature — responsive copy typography, the pseudo-state matrix,
// the @supports-gated anchor-positioned underline, the ::after fallback underline, the
// ::before WCAG target, the hidden scrollbar and the full-width composition — becomes a
// prefixed utility resolved on EVERY render (next-yak did it all at build time).
// Default-exports a single-instance render(i) (§6); the harness loops it. Class
// strings, sub-components, helpers and the per-group data formula are verbatim from the
// original cnfast tabs lane.
import React, { type FunctionComponent, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "cnfast";

const TAB_BASE =
  "relative inline-flex items-center cursor-pointer bg-transparent border-none h-[40px] " +
  "text-[16px] leading-[24px] tracking-[0.01em] font-normal min-[992px]:text-[14px] min-[992px]:leading-[20px] " +
  "text-[rgba(0,0,0,0.6)] " +
  "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:border-b-[3px] after:border-solid after:border-b-transparent after:[transition:opacity_150ms_linear] " +
  "before:absolute before:content-[''] before:w-full before:min-w-[40px] before:top-0 before:bottom-0 before:h-full " +
  "focus-visible:outline-none focus-visible:after:border-b-[3px] focus-visible:after:border-solid focus-visible:after:border-b-[#007bc7]";
const TAB_ACTIVE =
  "text-[#000] supports-[anchor-name:--test]:[anchor-name:--active-tab] " +
  "after:border-b-[#eeb524] supports-[anchor-name:--test]:after:border-b-[#ddd] supports-[anchor-name:--test]:after:opacity-0";
const TAB_INACTIVE =
  "hover:enabled:text-[#000] hover:enabled:after:border-b-[#ddd] " +
  "disabled:text-[rgba(0,0,0,0.26)] disabled:cursor-default";

const ITEM = "block m-0 p-0 w-min shrink-0 min-w-[40px]";

const TABLIST =
  "relative whitespace-nowrap flex flex-nowrap overflow-x-auto gap-[24px] [box-shadow:inset_0_-1px_0_0_#ddd] m-0 p-0 list-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "supports-[anchor-name:--test]:before:content-[''] supports-[anchor-name:--test]:before:absolute supports-[anchor-name:--test]:before:bottom-0 " +
  "supports-[anchor-name:--test]:before:[position-anchor:--active-tab] supports-[anchor-name:--test]:before:[left:anchor(left)] supports-[anchor-name:--test]:before:[right:anchor(right)] " +
  "supports-[anchor-name:--test]:before:h-[3px] supports-[anchor-name:--test]:before:bg-[#eeb524] supports-[anchor-name:--test]:before:[transition:left_150ms_ease-out,right_150ms_ease-out]";

const FULLWIDTH = "[&_li]:flex-1 [&_li]:flex [&_li]:justify-center [&_button]:flex-1";

interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}

const Tab: FunctionComponent<ITabProps> = ({ isActive, disabled, children }) => (
  <li role="presentation" className={ITEM}>
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={cn(TAB_BASE, isActive ? TAB_ACTIVE : TAB_INACTIVE)}
    >
      {children}
    </button>
  </li>
);

interface ITabsProps {
  className?: string;
  children: ReactNode;
}

const Tabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <ul role="tablist" onKeyDown={handleKeyDown} className={cn(TABLIST, className)}>
    {children}
  </ul>
);

const FullWidthTabs: FunctionComponent<ITabsProps> = ({ children, className }) => (
  <Tabs className={cn(FULLWIDTH, className)}>{children}</Tabs>
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
  // ONE tab group built from i with the same per-group formula as the original DATA array.
  const count = 3 + (i % 6);
  const g: Group = {
    id: i,
    count,
    activeIdx: i % count,
    fullWidth: i % 3 === 0,
    disabledIdx: i % 4 === 0 ? count - 1 : -1,
  };
  return g.fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />;
};
