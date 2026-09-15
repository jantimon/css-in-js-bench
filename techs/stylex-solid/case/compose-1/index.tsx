// bench-strategy: compose-depth
// @ts-nocheck
// StyleX on Solid — compose-1, the depth-sweep control: one component, one stylex.attrs()
// call over a single style carrying only the compose-3 base-level declarations.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import type { JSX } from '@solidjs/web';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
    l0: { display: "inline-flex", alignItems: "center", borderRadius: "6px", padding: "8px 16px", backgroundColor: "#2563eb", color: "#fff" },
});

const ComposedButton = (props: { children?: JSX.Element }) => <button {...stylex.attrs(styles.l0)}>{props.children}</button>;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
