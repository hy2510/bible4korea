/**
 * iOS safe-area utility class names (styles in app/globals.css).
 * Requires viewport-fit: cover — see SAFE_AREA_VIEWPORT in layout.
 */
export const SAFE_AREA = {
  /** padding-top: safe-area inset (notch / status bar) */
  top: "safe-t",
  /** Horizontal padding ≥ page gutter plus left/right insets */
  x: "safe-x",
  /** padding-bottom: max(1rem, safe-bottom) */
  bottom: "safe-b",
  /** padding-bottom: max(2.5rem, safe-bottom) — site footer */
  bottomLg: "safe-b-lg",
  /** Mobile full-screen panel insets; reset at sm+ */
  modal: "safe-modal",
  /** fixed bottom: 1.25rem + safe-bottom (1.5rem at sm+) */
  fixedBottom: "safe-fixed-b",
  /** fixed right: 1rem + safe-right (1.5rem at sm+) */
  fixedRight: "safe-fixed-r",
  /** fixed bottom bar flush to edge with inner bottom padding */
  fixedBottomBar: "safe-fixed-b-bar",
  /** Bottom sheet (mobile) → floating card (sm+) */
  overlayBar: "safe-overlay-bar",
} as const;

/** Enables env(safe-area-inset-*) on iOS standalone / PWA */
export const SAFE_AREA_VIEWPORT = {
  viewportFit: "cover",
} as const;
