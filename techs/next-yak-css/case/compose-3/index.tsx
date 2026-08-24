// bench-strategy: compose-depth
// next-yak (css prop) — compose-3. The SAME 3-level composition as the styled()
// lane, authored the css-prop way: each level is a css`…` fragment that interpolates
// the previous one (this lane's composition idiom — see tabs/multifile), and one
// host <button> carries the outermost fragment. Default-exports a single-instance
// render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

const l0 = css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const l1 = css`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const l2 = css`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;

const L0 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <button css={css`${l0};${xs}`}>{children}</button>;
const L1 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L0 xs={css`${l1};${xs}`}>{children}</L0>;
const L2 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L1 xs={css`${l2};${xs}`}>{children}</L1>;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
