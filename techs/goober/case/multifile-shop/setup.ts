import React from "react";
import { setup } from "goober";
import { shouldForwardProp } from "goober/should-forward-prop";

// goober needs setup(React.createElement, …) before any styled() renders. Each module
// that declares a styled component imports this, so whichever loads first runs it once
// (shouldForwardProp keeps $-props off the DOM).
setup(React.createElement, undefined, undefined, shouldForwardProp((p: string) => p[0] !== "$"));

export {};
