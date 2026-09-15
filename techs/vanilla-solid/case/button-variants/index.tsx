// bench-strategy: variant-ladder-style-values
// vanilla-solid — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override. index.tsx merges all
// three onto ONE element, which is how this library composes styles.
import type { JSX } from "@solidjs/web";
import { BUTTON } from "./button";
import { GHOST_BUTTON } from "./ghost-button";
import { GHOST_PRIMARY_BUTTON } from "./ghost-primary-button";

// No library, no merge — three literal class names on one element.
const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <button class={`${BUTTON} ${GHOST_BUTTON} ${GHOST_PRIMARY_BUTTON}`}>{props.children}</button>
);

export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
