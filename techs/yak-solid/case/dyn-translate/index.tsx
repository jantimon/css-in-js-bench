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
