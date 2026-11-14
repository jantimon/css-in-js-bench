import { styled } from "@yak/react";
import { Button } from "./button";

/** styled(Component) across a module boundary — the fold never crosses it. */
export const GhostButton = styled(Button)`
  background: transparent;
  border-color: oklch(87.2% 0.01 258.338);
  color: oklch(37.3% 0.034 259.733);
`;
