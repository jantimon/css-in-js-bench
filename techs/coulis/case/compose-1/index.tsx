// bench-strategy: compose-depth
// Coulis — compose-1, the depth-sweep control: one component whose static styles are
// created once in the module scope, carrying the compose-3 base-level declarations.
import React from "react";
import { createStyles } from "../../coulis";

const l0 = createStyles({ display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "8px 16px", background: "#2563eb", color: "#fff" });

const ComposedButton = ({ children }: { children?: React.ReactNode }) => <button className={l0}>{children}</button>;

export default (i: number) => <ComposedButton>{i}</ComposedButton>;
