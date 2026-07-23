// bench-strategy: compose-depth
// vanilla lane — compose-6, the depth-sweep upper bracket. The 6-level wrapper chain
// collapses to a single element with six literal class names over author-written CSS
// (./styles.css): no library, no per-level merge, no runtime work. Default-exports a
// single-instance render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";

const ComposedButton: FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => <button className="btn lvl1 lvl2 lvl3 lvl4 lvl5">{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
