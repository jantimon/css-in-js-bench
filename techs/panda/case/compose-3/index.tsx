import React, { type FunctionComponent } from 'react';
import { css, cx } from 'styled-system/css';

const L0 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <button className={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }), className)}>{children}</button>;
const L1 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L0 className={cx(css({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }), className)}>{children}</L0>;
const L2 = ({ className, children }: { className?: string; children?: React.ReactNode }) => <L1 className={cx(css({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }), className)}>{children}</L1>;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
