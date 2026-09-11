// bench-strategy: inline-style
// cn-solid — the documented best practice for a fully dynamic value: keep the utility
// list static (cn() sees the same cacheable input every render) and pass the
// per-instance transform as an inline style instead of baking it into an
// arbitrary-value class. Default-exports render(i) (§6); the harness loops it.
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const TranslatedDot = (props: P) => (
  <div class={cn("inline-block w-2 h-2")} style={{ transform: `translateX(${props.translateX}px)` }}>{props.children}</div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
