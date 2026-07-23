// bench-strategy: compose-depth
// vanilla lane — compose-1, the depth-sweep control. One element, one literal class
// name over author-written CSS (./styles.css): the hand-written ceiling for a
// single-level component. Default-exports a single-instance render(i) (§6); the
// harness loops it.
import React, { type FunctionComponent } from "react";

const ComposedButton: FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => <button className="btn">{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
