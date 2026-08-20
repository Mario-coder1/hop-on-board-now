/**
 * Automatizované RLS testy — overujú, že neprihlásený (anon) klient
 * nevie čítať ani mazať cudzie dáta.
 *
 * Bežia proti reálnemu backendu cez REST API s publikovateľným (anon) kľúčom.
 */
import { describe, it, expect } from "vitest";

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(path: string, init?: RequestInit) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

/** RLS neprepustí riadok → buď 401/403, alebo prázdny výsledok. */
function expectNoData(r: { status: number; body: unknown }) {
  if (r.status === 200) {
    expect(Array.isArray(r.body) ? r.body : []).toHaveLength(0);
  } else {
    expect([401, 403, 404]).toContain(r.status);
  }
}

const hasEnv = Boolean(URL && KEY);

describe.runIf(hasEnv)("RLS: anonymný klient nevidí citlivé dáta", () => {
  const sensitiveTables = [
    "profiles",
    "security_events",
    "university_memberships",
    "university_email_verifications",
    "blocked_users",
    "reports",
    "ratings",
    "notifications",
    "notification_reads",
    "wallets",
    "transactions",
    "payout_requests",
    "ride_requests",
    "user_locations",
    "driver_location_history",
    "push_subscriptions",
    "user_roles",
    "public_chat_messages",
    "vehicles",
    "route_alerts",
    "ride_templates",
    "page_views",
  ];

  for (const table of sensitiveTables) {
    it(`${table} — čítanie je zakázané`, async () => {
      expectNoData(await rest(`${table}?select=*&limit=1`));
    }, 20000);
  }

  it("profiles — nedá sa vytiahnuť telefón ani e-mail cez select", async () => {
    const r = await rest("profiles?select=id,phone&limit=5");
    expectNoData(r);
  }, 20000);
});

describe.runIf(hasEnv)("RLS: anonymný klient nevie mazať ani meniť cudzie dáta", () => {
  const mutations: Array<[string, string, RequestInit]> = [
    ["public_chat_messages", "mazanie správ", { method: "DELETE" }],
    ["ride_requests", "mazanie požiadaviek", { method: "DELETE" }],
    ["rides", "mazanie jázd", { method: "DELETE" }],
    ["blocked_users", "mazanie blokovaní", { method: "DELETE" }],
    ["profiles", "úprava profilov", { method: "PATCH", body: JSON.stringify({ full_name: "hacked" }) }],
    ["wallets", "úprava zostatku", { method: "PATCH", body: JSON.stringify({ balance: 999999 }) }],
    [
      "user_roles",
      "priradenie admin roly",
      { method: "POST", body: JSON.stringify({ user_id: crypto.randomUUID(), role: "admin" }) },
    ],
    [
      "security_events",
      "vkladanie audit logov",
      { method: "POST", body: JSON.stringify({ event_type: "fake", status: "success" }) },
    ],
  ];

  for (const [table, label] of mutations) {
    const init = mutations.find((m) => m[0] === table && m[1] === label)![2];
    it(`${table} — ${label} je zakázané`, async () => {
      const query = init.method === "POST" ? "" : "?id=neq.00000000-0000-0000-0000-000000000000";
      const r = await rest(`${table}${query}`, init);
      // Buď zamietnuté, alebo (pri DELETE/PATCH) nulový zásah riadkov.
      if (r.status === 200 || r.status === 204) {
        expect(Array.isArray(r.body) ? r.body : []).toHaveLength(0);
      } else {
        expect(r.status).toBeGreaterThanOrEqual(400);
      }
    }, 20000);
  }

  it("admin RPC funkcie nie sú dostupné anonymne", async () => {
    for (const fn of ["admin_visitor_stats", "admin_security_events", "admin_get_user_activity"]) {
      const r = await rest(`rpc/${fn}`, { method: "POST", body: "{}" });
      expect(r.status).toBeGreaterThanOrEqual(400);
    }
  }, 20000);
});
