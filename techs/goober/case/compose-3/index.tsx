// Goober — compose-3. Identical CSS to every other lane; the difference is the
// runtime: Goober flattens the 3-deep styled(styled) chain and injects CSS into a
// global sheet at render. Default-exports a single-instance render(i) (§6); the
// harness loops it.
//
// goober needs setup(React.createElement, ...) before any styled() renders — done
// here at module load, mirroring the old source (with shouldForwardProp so $-props
// don't leak to the DOM).
import React from 'react';
import { styled, setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

interface P { children?: React.ReactNode; }

const L0 = styled("button")`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;
const L1 = styled(L0)`border-left:1px solid hsl(53 70% 50%);padding-left:2px;`;
const L2 = styled(L1)`border-left:2px solid hsl(106 70% 50%);padding-left:4px;`;
const ComposedButton = L2;

export default (i: number) => {
  return <ComposedButton>{i}</ComposedButton>;
};
