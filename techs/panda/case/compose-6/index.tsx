// bench-strategy: compose-depth
// Panda (css fn) — six wrappers merge raw styles in order. The host creates
// atomic classes after the final merge, so each outer override wins.
import React from 'react';
import { css, cx } from 'styled-system/css';

type Props = { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode };

const L0 = ({ styles, className, children }: Props) => <button className={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }, styles), className)}>{children}</button>;
const L1 = ({ styles, className, children }: Props) => <L0 styles={css.raw({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }, styles)} className={className}>{children}</L0>;
const L2 = ({ styles, className, children }: Props) => <L1 styles={css.raw({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }, styles)} className={className}>{children}</L1>;
const L3 = ({ styles, className, children }: Props) => <L2 styles={css.raw({ borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: "6px" }, styles)} className={className}>{children}</L2>;
const L4 = ({ styles, className, children }: Props) => <L3 styles={css.raw({ borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: "8px" }, styles)} className={className}>{children}</L3>;
const L5 = ({ styles, className, children }: Props) => <L4 styles={css.raw({ borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: "10px" }, styles)} className={className}>{children}</L4>;
export default (i: number) => <L5>{i}</L5>;
