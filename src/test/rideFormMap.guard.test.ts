import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.resolve(__dirname, '../../', file), 'utf8');

describe('Ride creation form keeps the driver in control of the view', () => {
  it('never scrolls the page on its own while the driver fills the form', () => {
    const source = read('src/pages/CreateRide.tsx');
    expect(source).not.toContain('scrollIntoView');
    expect(source).not.toContain('window.scrollTo');
  });

  it('shows the map only after the driver opens it from a button', () => {
    const source = read('src/pages/CreateRide.tsx');
    expect(source).toContain('setMapOpen(true)');
    const dialog = source.indexOf('<Dialog open={mapOpen}');
    const map = source.indexOf('<Map\n');
    expect(dialog).toBeGreaterThan(-1);
    expect(map).toBeGreaterThan(-1);
    // The only Map render must live inside the dialog, never in the page flow.
    expect(map).toBeGreaterThan(dialog);
    expect(source).not.toContain('lg:sticky lg:top-24');
  });
});
