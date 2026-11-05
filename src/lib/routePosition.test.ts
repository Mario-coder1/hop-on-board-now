import { describe, expect, it } from 'vitest';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
async function position(lng: number, lat = 49) {
  const response = await fetch(`${url}/rest/v1/rpc/route_position_m`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ _route: [[18, 49], [18.1, 49], [18.2, 49]], _lng: lng, _lat: lat }),
  });
  expect(response.ok).toBe(true);
  const rows = await response.json();
  return rows[0] as { progress_m: number; distance_m: number };
}
describe('persisted-route pickup projection', () => {
  it('identifies pickup behind the driver on sparse segments', async () => {
    const driver = await position(18.15);
    const pickup = await position(18.02);
    expect(driver.progress_m).toBeGreaterThan(pickup.progress_m + 1000);
  });
  it('allows a pickup ahead of the driver', async () => {
    expect((await position(18.19)).progress_m).toBeGreaterThan((await position(18.15)).progress_m);
  });
  it('does not block a nearby pickup within the one-kilometre tolerance', async () => {
    expect((await position(18.15)).progress_m - (await position(18.149)).progress_m).toBeLessThan(1000);
  });
  it('does not treat off-route GPS as passed-pickup evidence', async () => {
    expect((await position(18.15, 49.1)).distance_m).toBeGreaterThan(2000);
  });
});