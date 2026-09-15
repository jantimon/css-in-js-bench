import type { JSX } from "@solidjs/web";
import { cn } from "cn";
import { Button } from "./button";

const GHOST = "bg-transparent border-gray-300 text-gray-700";

export const GhostButton = (props: { class?: string; children?: JSX.Element }) => (
  <Button class={cn(GHOST, props.class)}>{props.children}</Button>
);
