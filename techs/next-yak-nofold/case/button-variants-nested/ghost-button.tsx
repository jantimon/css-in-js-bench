import { styled } from "next-yak";
import { Button } from "./button";

/** styled(Component) across a module boundary — the fold never crosses it. */
export const GhostButton = styled(Button)`
  background: transparent;
  border-color: #d1d5db;
  color: #374151;
`;
