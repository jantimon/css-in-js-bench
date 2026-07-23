/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: React.FunctionComponent<P> = ({ translateX, children }) => (
  <div style={{ "--tx": `${translateX}px` } as React.CSSProperties} css={css`
      display:inline-block;width:8px;height:8px;
      transform: translateX(var(--tx));
    `}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
