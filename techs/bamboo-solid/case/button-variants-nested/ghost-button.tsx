// @ts-nocheck
import type { JSX } from "@solidjs/web";
import { css, cx } from "styled-system/css";
import { Button } from "./button";

// Selector specificity gives each wrapper priority over the style it extends.
const ghost = {
  "&&": {
    background: "transparent",
    borderColor: "#d1d5db",
    color: "#374151",
  },
};

export const GhostButton = (props: { class?: string; children?: JSX.Element }) => (
  <Button class={cx(css(ghost), props.class)}>{props.children}</Button>
);
