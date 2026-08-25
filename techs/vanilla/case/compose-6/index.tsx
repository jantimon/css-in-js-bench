// bench-strategy: compose-depth
// vanilla lane — compose-6, the depth-sweep upper bracket, as a REAL 6-level wrapper
// chain so the authored input matches every other lane: six React components, each
// prepending its own literal class and forwarding the rest down, over author-written
// CSS (./styles.css). No library and no merge, so this lane isolates what React itself
// charges for composition depth; every other lane's gap to it is library cost.
// Default-exports a single-instance render(i) (§6); the harness loops it.
import React, { type FunctionComponent } from "react";

interface P { className?: string; children?: React.ReactNode }
const join = (own: string, rest?: string) => (rest ? `${own} ${rest}` : own);

const L0: FunctionComponent<P> = ({ className, children }) => <button className={join("btn", className)}>{children}</button>;
const L1: FunctionComponent<P> = ({ className, children }) => <L0 className={join("lvl1", className)}>{children}</L0>;
const L2: FunctionComponent<P> = ({ className, children }) => <L1 className={join("lvl2", className)}>{children}</L1>;
const L3: FunctionComponent<P> = ({ className, children }) => <L2 className={join("lvl3", className)}>{children}</L2>;
const L4: FunctionComponent<P> = ({ className, children }) => <L3 className={join("lvl4", className)}>{children}</L3>;
const L5: FunctionComponent<P> = ({ className, children }) => <L4 className={join("lvl5", className)}>{children}</L4>;
const ComposedButton = L5;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
