// StyleX compiler config, vendored into this lane so the folder is self-contained
// (no import out of the suite — keeps extraction a folder move, §13). rootDir only
// needs to be a STABLE absolute path: it seeds StyleX's module-resolution hash, and
// since this lane both compiles the bundle and emits the sheet with the same config,
// the hashes match by construction.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)));

// useCSSLayers: true tells StyleX to equalize atomic-rule specificity with @layer
// priority tiers instead of the default `:not(#\#)` specificity hack. Every place the
// plugin is configured (both vite configs) reads this one object, so the mode is
// wired everywhere by construction.
export const STYLEX_CFG = {
  classNamePrefix: "x",
  unstable_moduleResolution: { type: "commonJS", rootDir: ROOT_DIR },
  useCSSLayers: true,
  runtimeInjection: false,
};
