// vanilla-solid lane — hand-written ceiling for a Tabs GROUP. The tab states collapse to
// a couple of literal class names over author-written CSS (./styles.css): no library, no
// runtime merge, no per-render work — the speed-of-light reference for Solid.
import type { JSX } from "@solidjs/web";

interface ITabProps {
  isActive?: boolean;
  disabled?: boolean;
  children?: JSX.Element;
}

const Tab = (props: ITabProps) => {
  const cls = () => {
    let c = "tab";
    if (props.isActive) c += " tab-active";
    else if (props.disabled) c += " tab-disabled";
    return c;
  };
  return (
    <li role="presentation" class="tab-item">
      <button
        type="button"
        role="tab"
        disabled={props.disabled}
        aria-selected={props.isActive ? "true" : "false"}
        tabindex={props.isActive ? 0 : -1}
        class={cls()}
      >
        {props.children}
      </button>
    </li>
  );
};

interface ITabsProps {
  class?: string;
  children: JSX.Element;
}

const Tabs = (props: ITabsProps) => (
  <ul role="tablist" onKeyDown={handleKeyDown} class={props.class ? "tablist " + props.class : "tablist"}>
    {props.children}
  </ul>
);

const FullWidthTabs = (props: ITabsProps) => (
  <Tabs class={props.class ? "tablist-full " + props.class : "tablist-full"}>{props.children}</Tabs>
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

export { Tab, Tabs, FullWidthTabs };
