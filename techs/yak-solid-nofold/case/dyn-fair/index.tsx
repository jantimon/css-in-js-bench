// bench-strategy: inline-style
// @yak/solid (no fold) — dyn-fair, for comparison only: the plain inline style over a static class that
// every other lane writes here, so the case compares like with like. This is NOT how a
// runtime value is written with yak. Its own path is a function interpolation the compiler
// turns into a CSS variable, and that is what dyn-translate measures; the gap between the
// two cases for this lane is what the CSS-variable path costs over the inline style.
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
