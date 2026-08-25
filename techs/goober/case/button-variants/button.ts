// goober's css() allocates its class the moment it runs, and the SSR entry drains the
// global sheet with extractCss() per render — so a module-level css() would be lost.
// The style value this module exports is therefore the CSS text itself, which the page
// interpolates into one styled() component (goober's own composition idiom).
export const button = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-width: 1px;
  border-style: solid;
  border-color: transparent;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
  background: #2563eb;
  color: #fff;
`;
