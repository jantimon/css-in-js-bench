// bench-strategy: compose-depth
// next-yak (css prop) — compose-6, the depth-sweep upper bracket: the compose-3
// fragment chain extended three more levels (L3–L5), each adding one small
// border-left/padding-left declaration and interpolating the previous fragment (this
// lane's composition idiom — see tabs/multifile). Default-exports a single-instance
// render(i) (§6); the harness loops it.
/** @jsxImportSource next-yak */
import React from 'react';
import { css } from 'next-yak';

const l0 = css`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const l1 = css`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const l2 = css`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const l3 = css`border-left:3px solid hsl(159 70% 50%);padding-left:6px;`;
const l4 = css`border-left:4px solid hsl(212 70% 50%);padding-left:8px;`;
const l5 = css`border-left:5px solid hsl(265 70% 50%);padding-left:10px;`;

const L0 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <button css={css`${l0};${xs}`}>{children}</button>;
const L1 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L0 xs={css`${l1};${xs}`}>{children}</L0>;
const L2 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L1 xs={css`${l2};${xs}`}>{children}</L1>;
const L3 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L2 xs={css`${l3};${xs}`}>{children}</L2>;
const L4 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L3 xs={css`${l4};${xs}`}>{children}</L3>;
const L5 = ({ xs, children }: { xs?: any; children?: React.ReactNode }) => <L4 xs={css`${l5};${xs}`}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
