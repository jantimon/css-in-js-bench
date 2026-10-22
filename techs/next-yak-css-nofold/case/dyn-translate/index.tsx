/** @jsxImportSource @yak/react */
import React from 'react';
import { css } from '@yak/react';

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
