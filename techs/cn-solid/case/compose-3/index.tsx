// cn-solid — a 3-level wrapper chain (L2→L1→L0), each level prepending its own utility
// fragment and re-running cn's cn() so the class list is concatenated THREE times per
// render. Default-exports a single-instance render(i) (§6). Same components as the
// React `cn` lane, so the pair isolates the framework.
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

const L0 = (props: { class?: string; children?: JSX.Element }) => <button class={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", props.class)}>{props.children}</button>;
const L1 = (props: { class?: string; children?: JSX.Element }) => <L0 class={cn("[border-left:1px_solid_hsl(53_70%_50%)] [padding-left:2px]", props.class)}>{props.children}</L0>;
const L2 = (props: { class?: string; children?: JSX.Element }) => <L1 class={cn("[border-left:2px_solid_hsl(106_70%_50%)] [padding-left:4px]", props.class)}>{props.children}</L1>;
export default (i: () => number) => <L2>{i()}</L2>;
