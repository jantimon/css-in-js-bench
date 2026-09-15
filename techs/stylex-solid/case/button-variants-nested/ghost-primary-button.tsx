// @ts-nocheck
import type { JSX } from "@solidjs/web";
import * as stylex from "@stylexjs/stylex";
import { GhostButton } from "./ghost-button";

const styles = stylex.create({
  ghostPrimary: {
    borderColor: "#2563eb",
    color: "#2563eb",
  },
});

export const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <GhostButton xs={[styles.ghostPrimary]}>{props.children}</GhostButton>
);
