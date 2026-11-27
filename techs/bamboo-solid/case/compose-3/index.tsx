// bench-strategy: compose-depth
// Bamboo Solid — compose-3 as a REAL 3-level wrapper chain: three Solid components, each
// joining its own precompiled class with the one handed down through cx(), as the
// vanilla-solid lane joins strings.
import type { JSX } from "@solidjs/web";
import { css, cx } from "styled-system/css";

interface P { class?: string; children?: JSX.Element }

const L0 = (props: P) => <button class={cx(css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" }), props.class)}>{props.children}</button>;
const L1 = (props: P) => <L0 class={cx(css({ borderLeft: "1px solid hsl(53 70% 50%)", paddingLeft: "2px" }), props.class)}>{props.children}</L0>;
const L2 = (props: P) => <L1 class={cx(css({ borderLeft: "2px solid hsl(106 70% 50%)", paddingLeft: "4px" }), props.class)}>{props.children}</L1>;
export default (i: () => number) => <L2>{i()}</L2>;
