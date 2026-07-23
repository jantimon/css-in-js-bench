// bench-strategy: css-var
// next-yak — a dynamic interpolation compiles to a CSS variable set via an inline
// style; this IS its documented path for runtime values, so this matches the
// dyn-translate lane. Default-exports render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'next-yak';

interface P {
  $translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot = styled.div<P>`
  display:inline-block;width:8px;height:8px;
  transform: translateX(${({ $translateX }) => $translateX}px);
`;

export default (i: number) => {
  return <TranslatedDot $translateX={i}>{i}</TranslatedDot>;
};
