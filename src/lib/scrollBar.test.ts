import { describe, expect, it } from 'vitest';
import {
  BOTTOM_BAR_SCROLL_THRESHOLD,
  BOTTOM_BAR_TOP_ZONE,
  shouldHideBottomBar,
} from './scrollBar';

describe('mobile bottom bar follows the scroll direction', () => {
  it('hides when the page moves down', () => {
    expect(shouldHideBottomBar(300, 340)).toBe(true);
    expect(shouldHideBottomBar(300, 900)).toBe(true);
  });

  it('shows again when the page moves up', () => {
    expect(shouldHideBottomBar(340, 300)).toBe(false);
    expect(shouldHideBottomBar(900, 300)).toBe(false);
  });

  it('stays visible at the top of the page even when scrolling down', () => {
    expect(shouldHideBottomBar(0, 40)).toBe(false);
    expect(shouldHideBottomBar(20, BOTTOM_BAR_TOP_ZONE)).toBe(false);
    // Just past the top zone the same movement hides it.
    expect(shouldHideBottomBar(BOTTOM_BAR_TOP_ZONE, BOTTOM_BAR_TOP_ZONE + 40)).toBe(true);
  });

  it('keeps the current state for movements smaller than the threshold', () => {
    expect(shouldHideBottomBar(300, 300 + BOTTOM_BAR_SCROLL_THRESHOLD - 1)).toBeNull();
    expect(shouldHideBottomBar(300, 300 - BOTTOM_BAR_SCROLL_THRESHOLD + 1)).toBeNull();
    expect(shouldHideBottomBar(300, 300)).toBeNull();
  });

  it('hides exactly at the threshold and shows exactly at the threshold upward', () => {
    expect(shouldHideBottomBar(300, 300 + BOTTOM_BAR_SCROLL_THRESHOLD)).toBe(true);
    expect(shouldHideBottomBar(300, 300 - BOTTOM_BAR_SCROLL_THRESHOLD)).toBe(false);
  });
});
