// bench-strategy: compose-depth
// vanilla lane — compose-3 as a REAL 3-level wrapper chain, so the authored input
// matches every other lane: three React components, each prepending its own literal
// class and forwarding the rest down, over author-written CSS (./styles.css). No
// library and no merge — just string concatenation per level — so this lane is the
// floor the other lanes' composition costs are measured against: the gap to vanilla
// is the library's cost, with React's own per-level cost already subtracted.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";

interface P { className?: string; children?: React.ReactNode }
const join = (own: string, rest?: string) => (rest ? `${own} ${rest}` : own);

const L0: FunctionComponent<P> = ({ className, children }) => <button className={join("btn", className)}>{children}</button>;
const L1: FunctionComponent<P> = ({ className, children }) => <L0 className={join("lvl1", className)}>{children}</L0>;
const L2: FunctionComponent<P> = ({ className, children }) => <L1 className={join("lvl2", className)}>{children}</L1>;
const ComposedButton = L2;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
