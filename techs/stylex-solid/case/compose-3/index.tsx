// @ts-nocheck
import type { JSX } from '@solidjs/web';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
    l0: { display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", backgroundColor: "#2563eb", color: "#fff" },
    // border-left longhands: StyleX drops the shorthand silently, losing the border.
    l1: { borderLeftWidth: "1px", borderLeftStyle: "solid", borderLeftColor: "hsl(53 70% 50%)", paddingLeft: "2px" },
    l2: { borderLeftWidth: "2px", borderLeftStyle: "solid", borderLeftColor: "hsl(106 70% 50%)", paddingLeft: "4px" },
});

const L0 = (props: { xs?: any[]; children?: JSX.Element }) => <button {...stylex.attrs(styles.l0, props.xs)}>{props.children}</button>;
const L1 = (props: { xs?: any[]; children?: JSX.Element }) => <L0 xs={[styles.l1, props.xs]}>{props.children}</L0>;
const L2 = (props: { xs?: any[]; children?: JSX.Element }) => <L1 xs={[styles.l2, props.xs]}>{props.children}</L1>;
export default (i: () => number) => <L2>{i()}</L2>;
