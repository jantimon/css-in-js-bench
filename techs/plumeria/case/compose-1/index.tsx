// bench-strategy: compose-depth
// Plumeria — compose-1, the depth-sweep control. One component, one element, one
// `classStyle` binding that the compiler rewrites to a literal `className`: nothing
// of the library is left at runtime. Default-exports a single-instance render(i)
// (§6); the harness loops it.
import React, { type FunctionComponent } from "react";
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

const ComposedButton: FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => (
  <button classStyle={styles.btn}>{children}</button>
);

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
