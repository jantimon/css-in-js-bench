// bench-strategy: variant-ladder-style-values
// Bamboo Solid — button-variants. Three modules, each exporting a STYLE VALUE (not a
// component): base button, ghost override, ghost-primary override, the Bamboo React lane's
// modules unchanged. index.tsx merges all three onto ONE element, which is how this library
// composes styles; the compiler reads the imported values and replaces the call with one
// class-string literal, so it lands in Solid's static template.
// @ts-nocheck
import type { JSX } from "@solidjs/web";
import { css } from "styled-system/css";
import { button } from "./button";
import { ghostButton } from "./ghost-button";
import { ghostPrimaryButton } from "./ghost-primary-button";

const GhostPrimaryButton = (props: { children?: JSX.Element }) => (
  <button class={css(button, ghostButton, ghostPrimaryButton)}>{props.children}</button>
);

export default (i: () => number) => <GhostPrimaryButton>{i()}</GhostPrimaryButton>;
