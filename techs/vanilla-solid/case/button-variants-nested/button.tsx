import type { JSX } from "@solidjs/web";

export const Button = (props: { class?: string; children?: JSX.Element }) => (
  <button class={props.class ? `btn ${props.class}` : "btn"}>{props.children}</button>
);
