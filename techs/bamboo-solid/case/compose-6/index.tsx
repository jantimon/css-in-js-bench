// bench-strategy: compose-depth
// Bamboo Solid — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain
// extended three more levels (L3–L5). Every css() call is compiled to its class-string
// literal; what remains per render is SIX cx() joins forwarding the class down.
import type { JSX } from "@solidjs/web";
import { css, cx } from "styled-system/css";

interface P { class?: string; children?: JSX.Element }

const L0 = (props: P) => <button class={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }), props.class)}>{props.children}</button>;
const L1 = (props: P) => <L0 class={cx(css({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }), props.class)}>{props.children}</L0>;
const L2 = (props: P) => <L1 class={cx(css({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }), props.class)}>{props.children}</L1>;
const L3 = (props: P) => <L2 class={cx(css({ borderLeft: "3px solid hsl(159 70% 50%)", paddingLeft: "6px" }), props.class)}>{props.children}</L2>;
const L4 = (props: P) => <L3 class={cx(css({ borderLeft: "4px solid hsl(212 70% 50%)", paddingLeft: "8px" }), props.class)}>{props.children}</L3>;
const L5 = (props: P) => <L4 class={cx(css({ borderLeft: "5px solid hsl(265 70% 50%)", paddingLeft: "10px" }), props.class)}>{props.children}</L4>;
export default (i: () => number) => <L5>{i()}</L5>;
