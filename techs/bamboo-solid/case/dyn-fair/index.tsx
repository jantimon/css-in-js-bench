// bench-strategy: inline-style
// Bamboo Solid — the only expressible pattern for a value unknown at build time: a static
// class (compiled to one class-string literal) plus the per-instance transform as an
// inline style. Bamboo rejects open runtime values at build time and delegates them to
// `style=`, which is why this lane sits out dyn-translate.
import type { JSX } from "@solidjs/web";
import { css } from "styled-system/css";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const TranslatedDot = (props: P) => (
  <div class={css({ display: "inline-block", width: "8px", height: "8px" })} style={{ transform: `translateX(${props.translateX}px)` }}>
    {props.children}
  </div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
