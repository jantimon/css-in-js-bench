// cn-solid — HIGH-cardinality dynamic transform: each instance bakes a unique translateX
// into an arbitrary-value utility, concatenated by cn's cn() on EVERY render. The
// naive form keeps the value in the class string. Default-exports a single-instance
// render(i) (§6).
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const TranslatedDot = (props: P) => (
  <div class={cn("inline-block w-2 h-2", "[transform:translateX(" + props.translateX + "px)]")}>{props.children}</div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
