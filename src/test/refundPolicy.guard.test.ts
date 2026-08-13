import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Regresné "guard" testy: ak niekto v budúcnosti odstráni PIN podmienku pri výplate
 * alebo nastavenie storno poplatku, tieto testy spadnú.
 */
const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");


/** Naposledy definovaná verzia danej DB funkcie. */
function latestFunctionDefinition(name: string): string {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let latest = "";
  for (const f of files) {
    const sql = readFileSync(path.join(migrationsDir, f), "utf8");
    const idx = sql.lastIndexOf(`FUNCTION public.${name}`);
    if (idx !== -1) latest = sql.slice(idx);
  }
  return latest;
}

describe("DB trigger release_ride_payment_to_driver (VOP 2.10)", () => {
  const def = latestFunctionDefinition("release_ride_payment_to_driver");

  it("existuje v migráciách", () => {
    expect(def.length).toBeGreaterThan(0);
  });

  it("blokuje výplatu bez overeného PIN kódu", () => {
    expect(def).toMatch(/pin_verified_at IS NULL/i);
  });
});

describe("nastavenie storno poplatku (VOP 2.1a)", () => {
  it("refund edge funkcia číta late_cancel_refund_percent z nastavení platformy", () => {
    const fn = readFileSync(
      path.resolve(__dirname, "../../supabase/functions/refund-ride-payment/index.ts"),
      "utf8",
    );
    expect(fn).toContain("late_cancel_refund_percent");
    expect(fn).toContain("resolveRefundPercent");
  });
});


describe("VOP dokument", () => {
  const terms = readFileSync(path.resolve(__dirname, "../pages/TermsOfService.tsx"), "utf8");

  it("obsahuje článok 2.1a o 50 % storne po príchode vodiča", () => {
    expect(terms).toContain("2.1a.");
    expect(terms).toMatch(/50 %/);
  });

  it("obsahuje článok 2.10 o výplate len pri PIN overení", () => {
    expect(terms).toContain("2.10.");
    expect(terms).toMatch(/PIN/);
  });
});
