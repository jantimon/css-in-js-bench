import type { JSX } from "@solidjs/web";
import { cn } from "cn";

const BASE = "inline-flex items-center justify-center gap-1.5 border border-solid border-transparent rounded-md px-4 py-2 text-sm font-semibold cursor-pointer bg-blue-600 text-white";

export const Button = (props: { class?: string; children?: JSX.Element }) => (
  <button class={cn(BASE, props.class)}>{props.children}</button>
);
