/**
 * E2E scenár (Playwright): overuje, že pravidlá zrušenia a výplat sú verejne
 * publikované vo VOP. Spustenie: `npx playwright test e2e/refund-policy.spec.ts`
 * (dev server musí bežať na http://localhost:8080).
 */
import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

test("VOP obsahuje 50 % storno po príchode vodiča a výplatu len pri PIN", async ({ page }) => {
  await page.goto(`${BASE}/terms`, { waitUntil: "domcontentloaded" });

  const body = page.locator("body");
  await expect(body).toContainText("2.1a.");
  await expect(body).toContainText("50 %");
  await expect(body).toContainText("storno poplatok");

  await expect(body).toContainText("2.10.");
  await expect(body).toContainText("PIN");
});
