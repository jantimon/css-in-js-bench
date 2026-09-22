// bench-strategy: dynamic-style-fn
// Plumeria on Solid — a function key IS the documented path for a runtime value: it
// compiles to one static atomic class holding `var(--hash-translateX, …)` plus an inline
// style that sets the variable, so 1,000 distinct values still share a single rule.
// Default-exports render(i) (§6); the harness loops it.
import type { JSX } from "@solidjs/web";
import * as css from "@plumeria/core";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const styles = css.create({
  base: {
    display: "inline-block",
    width: 8,
    height: 8
  },
  dyn: (translateX: number = 0) => ({
    transform: `translateX(${translateX}px)`
  }),
});

const TranslatedDot = (props: P) => (
  <div classStyle={[styles.base, styles.dyn(props.translateX)]}>{props.children}</div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
