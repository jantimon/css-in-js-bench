// bench-strategy: css-var
// @yak/solid — a dynamic interpolation compiles to a CSS variable set via an inline
// style; this IS its documented path for runtime values, so this matches the
// dyn-translate lane. Default-exports render(i) (§6); the harness loops it.
import { styled } from "@yak/solid";
import type { JSX } from "@solidjs/web";

interface P {
  $translateX: number;
  children?: JSX.Element;
}

const TranslatedDot = styled.div<P>`
  display:inline-block;width:8px;height:8px;
  transform: translateX(${({ $translateX }) => $translateX}px);
`;

export default (i: () => number) => {
  return <TranslatedDot $translateX={i()}>{i()}</TranslatedDot>;
};
