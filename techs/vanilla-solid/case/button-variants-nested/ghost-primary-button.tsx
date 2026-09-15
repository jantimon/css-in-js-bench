import type { JSX } from "@solidjs/web";
import { GhostButton } from "./ghost-button";

export const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <GhostButton class="btn-ghost-primary">{props.children}</GhostButton>
);
