import React, { type FunctionComponent } from 'react';
import { styled } from 'styled-system/jsx';

interface P {
  translateX: number;
  children?: React.ReactNode;
}

const TranslatedDot: FunctionComponent<P> = ({ translateX, children }) => (
  <styled.div {...{ display: "inline-block", width: "8px", height: "8px" }} transform={`translateX(${translateX}px)`}>{children}</styled.div>
);

export default (i: number) => {
  return <TranslatedDot translateX={i}>{i}</TranslatedDot>;
};
