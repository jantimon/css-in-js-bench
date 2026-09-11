// bench-strategy: compose-depth
// vanilla-solid lane — compose-1, the depth-sweep control. One element, one literal
// class name over author-written CSS (./styles.css): the hand-written ceiling for a
// single-level component.
import type { JSX } from "@solidjs/web";

const ComposedButton = (props: { children?: JSX.Element }) => <button class="btn">{props.children}</button>;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
