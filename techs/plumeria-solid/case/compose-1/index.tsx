// bench-strategy: compose-depth
// Plumeria on Solid — compose-1, the depth-sweep control. One component, one element,
// one `classStyle` binding that the compiler rewrites to a literal class attribute:
// nothing of the library is left at runtime. Default-exports a single-instance
// render(i) (§6); the harness loops it.
import type { JSX } from "@solidjs/web";
import * as css from "@plumeria/core";

const styles = css.create({
  btn: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    color: "#fff",
    background: "#2563eb",
    borderRadius: 6
  },
});

const ComposedButton = (props: { children?: JSX.Element }) => (
  <button classStyle={styles.btn}>{props.children}</button>
);

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
