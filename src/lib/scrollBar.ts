// Mobile bottom bar visibility while the page scrolls.
//
// The bar must not cover content the driver is filling in at the bottom of the
// page, so it slides away while scrolling down and comes back when the person
// scrolls up (or reaches the top of the page).

/** Minimum movement in px before a scroll counts as a real direction change. */
export const BOTTOM_BAR_SCROLL_THRESHOLD = 10;

/** While the page is this close to the top, the bar always stays visible. */
export const BOTTOM_BAR_TOP_ZONE = 80;

/**
 * Decide what the mobile bottom bar should do after a scroll.
 *
 * @param prevY scroll position before the movement
 * @param nextY scroll position after the movement
 * @returns true = hide the bar, false = show it, null = keep the current state
 */
export function shouldHideBottomBar(prevY: number, nextY: number): boolean | null {
  const delta = nextY - prevY;
  // Tiny movement (finger jitter, keyboard resize) — leave the bar as it is.
  if (Math.abs(delta) < BOTTOM_BAR_SCROLL_THRESHOLD) return null;
  // At the very top the bar is always available.
  if (nextY <= BOTTOM_BAR_TOP_ZONE) return false;
  // Going down out of the way, coming back up when the person goes up.
  return delta > 0;
}
