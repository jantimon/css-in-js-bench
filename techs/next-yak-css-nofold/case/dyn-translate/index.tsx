/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div css={css`
      display:inline-block;width:8px;height:8px;
      transform: translateX(${() => translateX}px);
    `}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
