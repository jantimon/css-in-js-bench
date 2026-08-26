// bench-strategy: inline-style
// next-yak — control case: a fully static styled.div (no dynamic interpolation, so
// no CSS-variable indirection) with the per-instance transform passed as a plain
// inline style. The delta to dyn-fair isolates what the CSS-variable path costs.
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
