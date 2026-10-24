// bench-strategy: compose-depth
// Zyzz — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain extended
// three more levels (L3–L5). Each level applies its own style with the incoming `className`
// as an override and forwards it down; later definitions win, matching the styled()
// chains. Default-exports a single-instance render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";
import { style } from "../../zyzz.config";

interface P {
  className?: string | undefined;
  children?: React.ReactNode;
}

const L0: FunctionComponent<P> = (props) => <button {...styles.l0({ className: props.className })}>{props.children}</button>;
const L1: FunctionComponent<P> = (props) => <L0 {...styles.l1({ className: props.className })}>{props.children}</L0>;
const L2: FunctionComponent<P> = (props) => <L1 {...styles.l2({ className: props.className })}>{props.children}</L1>;
const L3: FunctionComponent<P> = (props) => <L2 {...styles.l3({ className: props.className })}>{props.children}</L2>;
const L4: FunctionComponent<P> = (props) => <L3 {...styles.l4({ className: props.className })}>{props.children}</L3>;
const L5: FunctionComponent<P> = (props) => <L4 {...styles.l5({ className: props.className })}>{props.children}</L4>;
export default (i: number) => <L5>{i}</L5>;

namespace styles {
  export const l0 = style({
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "6px",
    padding: "8px 16px",
    background: "#2563eb",
    color: "#fff",
  });

  export const l1 = style({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" });

  export const l2 = style({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" });

  export const l3 = style({ borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: "6px" });

  export const l4 = style({ borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: "8px" });

  export const l5 = style({ borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: "10px" });
}
