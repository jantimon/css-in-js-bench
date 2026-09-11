// bench-strategy: compose-depth
// cn-solid — compose-6, the depth-sweep upper bracket: the compose-3 wrapper chain
// extended three more levels (L3–L5), each level prepending its own utility fragment
// and re-running cn's cn() so the class list is concatenated SIX times per
// render. Default-exports a single-instance render(i) (§6).
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

const L0 = (props: { class?: string; children?: JSX.Element }) => <button class={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", props.class)}>{props.children}</button>;
const L1 = (props: { class?: string; children?: JSX.Element }) => <L0 class={cn("[border-left:1px_solid_hsl(53_70%_50%)] [padding-left:2px]", props.class)}>{props.children}</L0>;
const L2 = (props: { class?: string; children?: JSX.Element }) => <L1 class={cn("[border-left:2px_solid_hsl(106_70%_50%)] [padding-left:4px]", props.class)}>{props.children}</L1>;
const L3 = (props: { class?: string; children?: JSX.Element }) => <L2 class={cn("[border-left:3px_solid_hsl(159_70%_50%)] [padding-left:6px]", props.class)}>{props.children}</L2>;
const L4 = (props: { class?: string; children?: JSX.Element }) => <L3 class={cn("[border-left:4px_solid_hsl(212_70%_50%)] [padding-left:8px]", props.class)}>{props.children}</L3>;
const L5 = (props: { class?: string; children?: JSX.Element }) => <L4 class={cn("[border-left:5px_solid_hsl(265_70%_50%)] [padding-left:10px]", props.class)}>{props.children}</L4>;
export default (i: () => number) => <L5>{i()}</L5>;
