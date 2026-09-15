// bench-strategy: compose-depth
// cn-solid — compose-1, the depth-sweep control: one component running ONE cn() pass
// over only the compose-3 base-level utilities (one merge per level; depth 1 = one
// merge). Default-exports a single-instance render(i) (§6).
import type { JSX } from "@solidjs/web";
import { cn } from "cn";

const ComposedButton = (props: { class?: string; children?: JSX.Element }) => <button class={cn("inline-flex items-center rounded-md px-4 py-2 bg-blue-600 text-white", props.class)}>{props.children}</button>;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
