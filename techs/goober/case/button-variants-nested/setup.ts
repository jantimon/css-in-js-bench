import React from "react";
import { setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

// goober needs setup(React.createElement, …) before any styled() renders. The three
// component modules each import this, so whichever loads first initialises it once.
setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

export {};
