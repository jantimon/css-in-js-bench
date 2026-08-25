// bench-strategy: compose-depth
// Bamboo — compose-1, the depth-sweep control: one component, one css() call carrying
// only the compose-3 base-level styles, no wrapper chain and no cx join. The compiler
// replaces the call with its class-string literal at build time.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import React from 'react';
import { css } from 'styled-system/css';

const ComposedButton = ({ children }: { children?: React.ReactNode }) => <button className={css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" })}>{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
