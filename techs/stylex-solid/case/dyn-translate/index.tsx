// @ts-nocheck
import type { JSX } from '@solidjs/web';
import * as stylex from '@stylexjs/stylex';

interface P {
  translateX: number;
  children?: JSX.Element;
}

const styles = stylex.create({
    base: { display: "inline-block", width: "8px", height: "8px" },
    dyn: (translateX: number) => ({ transform: `translateX(${translateX}px)` }),
});

const TranslatedDot = (props: P) => (
  <div {...stylex.attrs(styles.base, styles.dyn(props.translateX))}>{props.children}</div>
);

export default (i: () => number) => {
  return <TranslatedDot translateX={i()}>{i()}</TranslatedDot>;
};
