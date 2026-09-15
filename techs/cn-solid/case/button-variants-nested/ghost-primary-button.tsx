import type { JSX } from "@solidjs/web";
import { cn } from "cn";
import { GhostButton } from "./ghost-button";

const GHOST_PRIMARY = "border-blue-600 text-blue-600";

export const GhostPrimaryButton = (props: { class?: string; children?: JSX.Element }) => (
  <GhostButton class={cn(GHOST_PRIMARY, props.class)}>{props.children}</GhostButton>
);
