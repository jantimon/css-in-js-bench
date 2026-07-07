// vanilla lane — the hand-written ceiling for a 3-level composition. The wrapper chain
// collapses to a single element with three literal class names over author-written CSS
// (./styles.css): no library, no per-level merge, no runtime work. Default-exports a
// single-instance render(i) (§6); the harness loops it. The component and class names are
// verbatim from the original vanilla compose-3 lane.
import React, { type FunctionComponent } from "react";

const ComposedButton: FunctionComponent<{ children?: React.ReactNode }> = ({ children }) => <button className="btn lvl1 lvl2">{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
