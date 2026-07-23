// bench-strategy: inline-style
// styled-components — the documented best practice for a fully dynamic value: keep the
// template static (ONE class for all instances) and pass the per-instance transform as
// an inline style via .attrs, as the styled-components FAQ recommends for styles that
// change many times ("over 50 times per second"/high-cardinality values). Default-exports
// render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'styled-components';

interface P {
  $translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot = styled.div.attrs<P>(({ $translateX }) => ({
  style: { transform: `translateX(${$translateX}px)` },
}))`
  display:inline-block;width:8px;height:8px;
`;

export default (i: number) => {
  return <TranslatedDot $translateX={i}>{i}</TranslatedDot>;
};
