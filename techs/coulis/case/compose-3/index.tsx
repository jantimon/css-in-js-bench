// @ts-nocheck
// Coulis — compose-3. Each wrapper level hands its style overrides down (later wins);
// the leaf resolves the merged object with one createStyles call at render.
import React from "react";
import { createStyles } from "../../coulis";

const l0 = { display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "8px 16px", background: "#2563eb", color: "#fff" };
const l1 = { borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: 2 };
const l2 = { borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: 4 };

type P = { styles?: object; children?: React.ReactNode };
const L0 = ({ styles, children }: P) => <button className={createStyles({ ...l0, ...styles })}>{children}</button>;
const L1 = ({ styles, children }: P) => <L0 styles={{ ...l1, ...styles }}>{children}</L0>;
const L2 = ({ styles, children }: P) => <L1 styles={{ ...l2, ...styles }}>{children}</L1>;
export default (i: number) => <L2>{i}</L2>;
