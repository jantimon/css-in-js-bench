// @ts-nocheck
import type { JSX } from "@solidjs/web";
import { css } from "styled-system/css";
import { GhostButton } from "./ghost-button";

// Selector specificity gives each wrapper priority over the style it extends.
const ghostPrimary = {
  "&&&": {
    borderColor: "#2563eb",
    color: "#2563eb",
  },
};

export const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <GhostButton class={css(ghostPrimary)}>{props.children}</GhostButton>
);
