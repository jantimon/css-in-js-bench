// bench-strategy: compose-depth
// Bamboo Solid — compose-1, the depth-sweep control: one component, one css() call carrying
// only the compose-3 base-level styles, no wrapper chain and no cx join. The compiler
// replaces the call with its class-string literal before Solid compiles the JSX, so the
// class lands in Solid's static template.
import type { JSX } from "@solidjs/web";
import { css } from "styled-system/css";

const ComposedButton = (props: { children?: JSX.Element }) => (
  <button class={css({ display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", background: "#2563eb", color: "#fff" })}>
    {props.children}
  </button>
);

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
