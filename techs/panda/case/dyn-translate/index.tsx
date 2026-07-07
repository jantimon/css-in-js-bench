import React, { type FunctionComponent } from 'react';
import { css } from 'styled-system/css';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <div className={css({ ...{ display: "inline-block", width: "8px", height: "8px" }, transform: `translateX(${translateX}px)` })}>{children}</div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
