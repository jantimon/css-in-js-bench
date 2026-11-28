// The lane's single Coulis instance: the contract every case styles against.
import { createCoulis } from "coulis";

const rule = "coulis[selector]{coulis[declaration]}";
const media = (query: string, selector = "coulis[selector]") => `@media ${query}{${selector}{coulis[declaration]}}`;

export const { createStyles, getCriticalStyleSheets, getStyleSheets } = createCoulis({
  properties() {
    return {
      alignItems: true, aspectRatio: true, background: true, backgroundColor: true, backgroundImage: true,
      border: true, borderBottom: true, borderBottomColor: true, borderColor: true, borderLeft: true,
      borderRadius: true, bottom: true, boxShadow: true, clip: true, color: true, containerName: true,
      containerType: true, content: true, cursor: true, display: true, flex: true, flexDirection: true,
      flexShrink: true, flexWrap: true, fontSize: true, fontWeight: true, gap: true, gridTemplateColumns: true,
      height: true, inset: true, justifyContent: true, left: true, letterSpacing: true, lineHeight: true,
      listStyle: true, margin: true, marginRight: true, marginTop: true, minHeight: true, minWidth: true,
      outline: true, outlineOffset: true, overflow: true, overflowX: true, padding: true, paddingLeft: true,
      position: true, right: true, scrollbarWidth: true, textAlign: true, textDecoration: true,
      textOverflow: true, top: true, transform: true, transition: true, translate: true, userSelect: true,
      whiteSpace: true, width: true,
    };
  },
  states: {
    desktop: media("(min-width: 992px)"),
    tablet: media("(min-width: 640px)"),
    reduce: media("(prefers-reduced-motion: reduce)"),
    wide: `@container tile (min-width: 240px){${rule}}`,
    hover: "coulis[selector]:hover{coulis[declaration]}",
    disabled: "coulis[selector]:disabled{coulis[declaration]}",
    focusVisible: "coulis[selector]:focus-visible{coulis[declaration]}",
    active: "coulis[selector]:active:not(:disabled){coulis[declaration]}",
    hoverEnabled: "coulis[selector]:hover:not(:disabled){coulis[declaration]}",
    hoverIdle:
      "coulis[selector]:hover:not(:active,:disabled),coulis[selector]:focus-visible:not(:active,:disabled){coulis[declaration]}",
    before: "coulis[selector]::before{coulis[declaration]}",
    after: "coulis[selector]::after{coulis[declaration]}",
    afterHover: "coulis[selector]:hover:not(:disabled)::after{coulis[declaration]}",
    afterFocus: "coulis[selector]:focus-visible::after{coulis[declaration]}",
    beforeCoarse: media("(hover: none) and (pointer: coarse)", "coulis[selector]::before"),
    beforeFine: media("(hover: hover) and (pointer: fine)", "coulis[selector]::before"),
    scrollbar: "coulis[selector]::-webkit-scrollbar{coulis[declaration]}",
  },
});
