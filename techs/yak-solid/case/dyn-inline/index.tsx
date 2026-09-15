// bench-strategy: inline-style
// @yak/solid — control case: a fully static styled.div (no dynamic interpolation, so
// no CSS-variable indirection) with the per-instance transform passed as a plain
// inline style. The delta to dyn-fair isolates what the CSS-variable path costs.
// Default-exports render(i) (§6); the harness loops it.
import { styled } from "@yak/solid";
import type { JSX } from "@solidjs/web";

interface P {
  translateX: number;
  children?: JSX.Element;
}

const Dot = styled.div`
  display:inline-block;width:8px;height:8px;
`;

const TranslatedDot = (props: P) => (
  <Dot style={{ transform: `translateX(${props.translateX}px)` }}>{props.children}</Dot>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
