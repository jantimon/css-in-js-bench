// bench-strategy: inline-style
// next-yak (styled, no fold) — dyn-fair, for comparison only: the plain inline style over a static class that
// every other lane writes here, so the case compares like with like. This is NOT how a
// runtime value is written with yak. Its own path is a function interpolation the compiler
// turns into a CSS variable, and that is what dyn-translate measures; the gap between the
// two cases for this lane is what the CSS-variable path costs over the inline style.
// Default-exports render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'next-yak';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const Dot = styled.div`
  display:inline-block;width:8px;height:8px;
`;

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <Dot style={{ transform: `translateX(${translateX}px)` }}>{children}</Dot>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
