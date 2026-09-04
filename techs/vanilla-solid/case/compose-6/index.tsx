// bench-strategy: compose-depth
// vanilla-solid lane — compose-6, the depth-sweep upper bracket, as a REAL 6-level
// wrapper chain: six Solid components, each prepending its own literal class and
// forwarding the rest down, over author-written CSS (./styles.css). No library and no
// merge, so this lane isolates what Solid itself charges for composition depth.
import type { JSX } from "@solidjs/web";

interface P { class?: string; children?: JSX.Element }
const join = (own: string, rest?: string) => (rest ? `${own} ${rest}` : own);

const L0 = (props: P) => <button class={join("btn", props.class)}>{props.children}</button>;
const L1 = (props: P) => <L0 class={join("lvl1", props.class)}>{props.children}</L0>;
const L2 = (props: P) => <L1 class={join("lvl2", props.class)}>{props.children}</L1>;
const L3 = (props: P) => <L2 class={join("lvl3", props.class)}>{props.children}</L2>;
const L4 = (props: P) => <L3 class={join("lvl4", props.class)}>{props.children}</L3>;
const L5 = (props: P) => <L4 class={join("lvl5", props.class)}>{props.children}</L4>;
const ComposedButton = L5;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
