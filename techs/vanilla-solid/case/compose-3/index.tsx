// bench-strategy: compose-depth
// vanilla-solid lane — compose-3 as a REAL 3-level wrapper chain, so the authored input
// matches every other lane: three Solid components, each prepending its own literal
// class and forwarding the rest down, over author-written CSS (./styles.css). No library
// and no merge — just string concatenation per level — so this lane is the floor the
// Solid lane's composition cost is measured against.
import type { JSX } from "@solidjs/web";

interface P { class?: string; children?: JSX.Element }
const join = (own: string, rest?: string) => (rest ? `${own} ${rest}` : own);

const L0 = (props: P) => <button class={join("btn", props.class)}>{props.children}</button>;
const L1 = (props: P) => <L0 class={join("lvl1", props.class)}>{props.children}</L0>;
const L2 = (props: P) => <L1 class={join("lvl2", props.class)}>{props.children}</L1>;
const ComposedButton = L2;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
