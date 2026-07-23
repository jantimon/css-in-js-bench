// bench-strategy: compose-depth
// @ts-nocheck
// Panda (style props) — compose-3. The SAME 3-level wrapper chain as the other
// lanes: each level prepends its own style object and forwards the accumulated list
// down, and the leaf <styled.button> merges them via the css prop (later entries
// win, matching the styled() chains). The per-level objects are defined with
// css.raw() so `panda cssgen` extracts their atomic rules at the definition site —
// the runtime array threaded through `xs` is not a statically readable shape.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import React from 'react';
import { styled } from 'styled-system/jsx';
import { css } from 'styled-system/css';

const l0 = css.raw({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" });
const l1 = css.raw({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" });
const l2 = css.raw({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" });

const L0 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <styled.button css={[l0, ...(xs ?? [])]}>{children}</styled.button>;
const L1 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L0 xs={[l1, ...(xs ?? [])]}>{children}</L0>;
const L2 = ({ xs, children }: { xs?: any[]; children?: React.ReactNode }) => <L1 xs={[l2, ...(xs ?? [])]}>{children}</L1>;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
