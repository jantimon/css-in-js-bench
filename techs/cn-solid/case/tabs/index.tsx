// cn-solid — a real-project Tabs GROUP expressed as Tailwind utilities, single file, resolved by
// cn's cn(). Every feature — responsive copy typography, the pseudo-state matrix, the
// @supports-gated anchor-positioned underline, the ::after fallback underline, the
// ::before WCAG target, the hidden scrollbar and the full-width composition — becomes a
// prefixed utility resolved on EVERY render. Class strings and the per-group data
// formula are verbatim from the React `cn` lane, so the pair isolates the framework.
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

const TAB_BASE =
  "relative inline-flex items-center cursor-pointer bg-transparent border-none h-[40px] " +
  "text-[16px] leading-[24px] tracking-[0.01em] font-normal min-[992px]:text-[14px] min-[992px]:leading-[20px] " +
  "text-[rgba(0,0,0,0.6)] " +
  "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:border-0 after:border-b-[3px] after:border-solid after:border-b-transparent after:[transition:opacity_150ms_linear] " +
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
  children?: JSX.Element;
}

// aria-selected is written as an explicit "true"/"false" string: Solid drops a `false`
// boolean attribute entirely, which would not match the React lanes' markup.
const Tab = (props: ITabProps) => (
  <li role="presentation" class={ITEM}>
    <button
      type="button"
      role="tab"
      disabled={props.disabled}
      aria-selected={props.isActive ? "true" : "false"}
      tabindex={props.isActive ? 0 : -1}
      class={cn(TAB_BASE, props.isActive ? TAB_ACTIVE : TAB_INACTIVE)}
    >
      {props.children}
    </button>
  </li>
);

interface ITabsProps {
  class?: string;
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} class={cn(TABLIST, props.class)}>
    {props.children}
  </ul>
);

const FullWidthTabs = (props: ITabsProps) => (
  <Tabs class={cn(FULLWIDTH, props.class)}>{props.children}</Tabs>
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
// `group={g()}` would rebuild the object on every read of it. `disabled` is computed by
// a call rather than written as `&&` inline, because the compiler wraps a logical
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

export default (i: () => number) => {
  // ONE tab group built from i with the same per-group formula as every other lane.
  // Cached on the index: the accessor is read many times per render and the formula is
  // the same every time, so rebuilding the object per read would be pure waste.
  let last = NaN;
  let cached!: Group;
  const g = (): Group => {
    const n = i();
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
  return <>{g().fullWidth ? <FullWidthTabGroup group={g} /> : <TabGroup group={g} />}</>;
};
