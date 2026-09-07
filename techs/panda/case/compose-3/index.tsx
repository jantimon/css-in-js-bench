import React, { type FunctionComponent } from 'react';
import { css, cx } from 'styled-system/css';

type Props = { styles?: Parameters<typeof css>[0]; className?: string; children?: React.ReactNode };

const L0 = ({ styles, className, children }: Props) => <button className={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }, styles), className)}>{children}</button>;
const L1 = ({ styles, className, children }: Props) => <L0 styles={css.raw({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }, styles)} className={className}>{children}</L0>;
const L2 = ({ styles, className, children }: Props) => <L1 styles={css.raw({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }, styles)} className={className}>{children}</L1>;
export default (i: number) => <L2>{i}</L2>;
