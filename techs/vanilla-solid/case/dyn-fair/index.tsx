// bench-strategy: inline-style
// vanilla-solid lane — the dynamic value done the speed-of-light way: a static class
// over author-written CSS (./styles.css) plus the per-instance value passed via an
// inline style, so no class string is generated per render.
import type { JSX } from "@solidjs/web";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const TranslatedDot = (props: P) => (
  <div class="dynBase" style={{ transform: `translateX(${props.translateX}px)` }}>{props.children}</div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
