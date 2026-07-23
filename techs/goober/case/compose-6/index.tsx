// bench-strategy: compose-depth
// Goober — compose-6, the depth-sweep upper bracket. The compose-3 chain extended
// three more levels (L3–L5), each adding one small border-left/padding-left
// declaration, so Goober flattens a 6-deep styled(styled) chain and injects CSS into
// a global sheet at render. Default-exports a single-instance render(i) (§6); the
// harness loops it.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load (with shouldForwardProp so $-props don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

const L0 = styled("button")`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const L1 = styled(L0)`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const L2 = styled(L1)`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const L3 = styled(L2)`border-left:3px solid hsl(159 70% 50%);padding-left:6px;`;
const L4 = styled(L3)`border-left:4px solid hsl(212 70% 50%);padding-left:8px;`;
const L5 = styled(L4)`border-left:5px solid hsl(265 70% 50%);padding-left:10px;`;
const ComposedButton = L5;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
