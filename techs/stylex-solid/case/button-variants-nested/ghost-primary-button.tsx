// @ts-nocheck
import type { JSX } from "@solidjs/web";
import * as stylex from "@stylexjs/stylex";
import { GhostButton } from "./ghost-button";

const styles = stylex.create({
  ghostPrimary: {
    borderColor: "oklch(54.6% 0.245 262.881)",
    color: "oklch(54.6% 0.245 262.881)",
  },
});

export const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <GhostButton xs={[styles.ghostPrimary]}>{props.children}</GhostButton>
);
