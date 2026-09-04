// vanilla-solid lane — the hand-written speed-of-light ceiling. Plain class names over
// author-written CSS (./styles.css). No styling library, no runtime: this is what the
// yak-solid lane is measured against — so it renders the SAME DenseButton as the React
// lanes' shared template, structure-for-structure and pixel-for-pixel.
//
// realistic-button varies variant/disabled/icon by index (it is NOT a static case): the
// button alternates standard/primary, is disabled every 5th instance, and shows the icon
// on even instances — identical to the shared template.
const Icon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor" />
  </svg>
);

export default (i: () => number) => {
  const variant = () => (i() % 2 ? "primary" : "standard");
  const disabled = () => i() % 5 === 0;
  const hasIcon = () => i() % 2 === 0;
  return (
    <button type="button" class={`db-btn db-btn--${variant()}`} disabled={disabled()}>
      {hasIcon() && (
        <span class="db-btn__icon" aria-hidden="true">
          <Icon />
        </span>
      )}
      Buy {i()}
    </button>
  );
};
