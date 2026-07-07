// styled-components — dyn-translate. Identical CSS to every other lane; the
// difference is the runtime: styled-components resolves the per-instance
// transform and injects a unique rule at render. Default-exports a
// single-instance render(i) (§6); the harness loops it. HIGH cardinality: every i
// yields a distinct translateX value, so each instance produces a new class.
import React from 'react';
import { styled } from 'styled-components';

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
