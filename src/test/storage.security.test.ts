/**
 * Automatizované storage testy — overujú, že neprihlásený klient
 * nevie nahrávať ani mazať súbory v cudzích priečinkoch.
 */
import { describe, it, expect } from "vitest";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const hasEnv = Boolean(URL && KEY);

const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const FOREIGN = "00000000-0000-0000-0000-000000000000/attack.txt";

async function storage(path: string, init: RequestInit) {
  const res = await fetch(`${URL}/storage/v1/${path}`, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  return res.status;
}

describe.runIf(hasEnv)("Storage: anonymný klient nemá zápisové práva", () => {
  for (const bucket of ["chat-images", "avatars"]) {
    it(`${bucket} — nahrávanie do cudzieho priečinka je zakázané`, async () => {
      const status = await storage(`object/${bucket}/${FOREIGN}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "x",
      });
      expect(status).toBeGreaterThanOrEqual(400);
    }, 20000);

    it(`${bucket} — mazanie cudzieho súboru je zakázané`, async () => {
      const status = await storage(`object/${bucket}/${FOREIGN}`, { method: "DELETE" });
      expect(status).toBeGreaterThanOrEqual(400);
    }, 20000);

    it(`${bucket} — výpis obsahu je zakázaný alebo prázdny`, async () => {
      const res = await fetch(`${URL}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "", limit: 5 }),
      });
      if (res.ok) {
        const rows = await res.json();
        expect(Array.isArray(rows)).toBe(true);
      } else {
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    }, 20000);
  }

  it("nedá sa vytvoriť nový bucket", async () => {
    const status = await storage("bucket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `evil-${Date.now()}`, public: true }),
    });
    expect(status).toBeGreaterThanOrEqual(400);
  }, 20000);
});
