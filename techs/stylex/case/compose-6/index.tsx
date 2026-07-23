// bench-strategy: compose-depth
// @ts-nocheck
// StyleX — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain
// extended three more levels (L3–L5), each level prepending its own style to the
// accumulated list, so the leaf runs stylex.props() over six styles per render
// (later entries win, matching the styled() chains). Default-exports a
// single-instance render(i) (§6); the harness loops it.
import React from 'react';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
    l0: { display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", backgroundColor: "#2563eb", color: "#fff" },
    // border-left longhands: StyleX drops the shorthand silently, losing the border.
    l1: { borderLeftWidth: "1px", borderLeftStyle: "solid", borderLeftColor: "hsl(53 70% 50%)", paddingLeft: "2px" },
    l2: { borderLeftWidth: "2px", borderLeftStyle: "solid", borderLeftColor: "hsl(106 70% 50%)", paddingLeft: "4px" },
    l3: { borderLeftWidth: "3px", borderLeftStyle: "solid", borderLeftColor: "hsl(159 70% 50%)", paddingLeft: "6px" },
    l4: { borderLeftWidth: "4px", borderLeftStyle: "solid", borderLeftColor: "hsl(212 70% 50%)", paddingLeft: "8px" },
    l5: { borderLeftWidth: "5px", borderLeftStyle: "solid", borderLeftColor: "hsl(265 70% 50%)", paddingLeft: "10px" },
});

const L0 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <button {...stylex.props(styles.l0, ...(xs || []))}>{children}</button>;
const L1 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L0 xs={[styles.l1, ...(xs || [])]}>{children}</L0>;
const L2 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L1 xs={[styles.l2, ...(xs || [])]}>{children}</L1>;
const L3 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L2 xs={[styles.l3, ...(xs || [])]}>{children}</L2>;
const L4 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L3 xs={[styles.l4, ...(xs || [])]}>{children}</L3>;
const L5 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L4 xs={[styles.l5, ...(xs || [])]}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
