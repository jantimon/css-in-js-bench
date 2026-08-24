// @ts-nocheck
import React, { type FunctionComponent } from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
    l0: { display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", backgroundColor: "#2563eb", color: "#fff" },
    // border-left longhands: StyleX drops the shorthand silently, losing the border.
    l1: { borderLeftWidth: "1px", borderLeftStyle: "solid", borderLeftColor: "hsl(53 70% 50%)", paddingLeft: "2px" },
    l2: { borderLeftWidth: "2px", borderLeftStyle: "solid", borderLeftColor: "hsl(106 70% 50%)", paddingLeft: "4px" },
});

const ComposedButton = ({ children }: { xs?: any[]; children?: React.ReactNode }) => <button {...stylex.props(styles.l0, styles.l1, styles.l2)}>{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
