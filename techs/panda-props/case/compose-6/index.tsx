// bench-strategy: compose-depth
// @ts-nocheck
// Panda (style props) — compose-6, the depth-sweep upper bracket: the compose-3
// wrapper chain extended three more levels (L3–L5), each adding one small
// border-left/padding-left object, so the leaf <styled.button> css-prop merge spans
// six style objects per render (later entries win, matching the styled() chains).
// The per-level objects are defined with css.raw() so `panda cssgen` extracts their
// atomic rules at the definition site — the runtime array threaded through `xs` is
// not a statically readable shape. Default-exports a single-instance render(i) (§6);
// the harness loops it.
import React from 'react';
import { styled } from 'styled-system/jsx';
import { css } from 'styled-system/css';

const l0 = css.raw({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" });
const l1 = css.raw({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" });
const l2 = css.raw({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" });
const l3 = css.raw({ borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: "6px" });
const l4 = css.raw({ borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: "8px" });
const l5 = css.raw({ borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: "10px" });

const L0 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <styled.button css={[l0, xs]}>{children}</styled.button>;
const L1 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L0 xs={[l1, xs]}>{children}</L0>;
const L2 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L1 xs={[l2, xs]}>{children}</L1>;
const L3 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L2 xs={[l3, xs]}>{children}</L2>;
const L4 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L3 xs={[l4, xs]}>{children}</L3>;
const L5 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L4 xs={[l5, xs]}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
