// @ts-nocheck
import type { JSX } from "@solidjs/web";
import * as stylex from "@stylexjs/stylex";
import { Button } from "./button";

const styles = stylex.create({
  ghost: {
    backgroundColor: "transparent",
    borderColor: "#d1d5db",
    color: "#374151",
  },
});

export const GhostButton = (props: { xs?: any[]; children?: JSX.Element }) => (
  <Button xs={[styles.ghost, props.xs]}>{props.children}</Button>
);
