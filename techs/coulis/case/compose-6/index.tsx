// bench-strategy: compose-depth
// @ts-nocheck
// Coulis — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain
// extended three more levels (L3–L5). Each level hands its overrides down (later
// wins); the leaf resolves the merged object with one createStyles call at render.
import React from "react";
import { createStyles } from "../../coulis";

const l0 = { display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "8px 16px", background: "#2563eb", color: "#fff" };
const l1 = { borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: 2 };
const l2 = { borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: 4 };
const l3 = { borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: 6 };
const l4 = { borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: 8 };
const l5 = { borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: 10 };

type P = { styles?: object; children?: React.ReactNode };
const L0 = ({ styles, children }: P) => <button className={createStyles({ ...l0, ...styles })}>{children}</button>;
const L1 = ({ styles, children }: P) => <L0 styles={{ ...l1, ...styles }}>{children}</L0>;
const L2 = ({ styles, children }: P) => <L1 styles={{ ...l2, ...styles }}>{children}</L1>;
const L3 = ({ styles, children }: P) => <L2 styles={{ ...l3, ...styles }}>{children}</L2>;
const L4 = ({ styles, children }: P) => <L3 styles={{ ...l4, ...styles }}>{children}</L3>;
const L5 = ({ styles, children }: P) => <L4 styles={{ ...l5, ...styles }}>{children}</L4>;
export default (i: number) => <L5>{i}</L5>;
