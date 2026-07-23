// bench-strategy: compose-depth
// Panda (css fn) — compose-6, the depth-sweep upper bracket: the compose-3 wrapper
// chain extended three more levels (L3–L5), each level running its own css() + cx
// merge and forwarding className down, so class concatenation happens SIX times per
// render. Default-exports a single-instance render(i) (§6); the harness loops it.
import React from 'react';
import { css, cx } from 'styled-system/css';

const L0 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <button className={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }), className)}>{children}</button>;
const L1 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L0 className={cx(css({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }), className)}>{children}</L0>;
const L2 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L1 className={cx(css({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }), className)}>{children}</L1>;
const L3 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L2 className={cx(css({ borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: "6px" }), className)}>{children}</L2>;
const L4 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L3 className={cx(css({ borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: "8px" }), className)}>{children}</L3>;
const L5 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L4 className={cx(css({ borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: "10px" }), className)}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
