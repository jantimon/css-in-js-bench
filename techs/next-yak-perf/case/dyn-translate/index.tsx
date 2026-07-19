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
