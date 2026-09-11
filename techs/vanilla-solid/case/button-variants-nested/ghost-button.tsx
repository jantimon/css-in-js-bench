import type { JSX } from "@solidjs/web";
import { Button } from "./button";

export const GhostButton = (props: { class?: string; children?: JSX.Element }) => (
  <Button class={props.class ? `btn-ghost ${props.class}` : "btn-ghost"}>{props.children}</Button>
);
