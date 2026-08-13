import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canPassengerCancel,
  isLateCancellation,
  isPayoutEligible,
  isRefundBlocked,
  normalizeLateCancelPercent,
  partitionOnRideEnd,
  resolveRefundPercent,
  splitRefund,
} from "../_shared/refundRules.ts";

Deno.test("VOP 2.1 — pasažier môže zrušiť len pred vyzdvihnutím", () => {
  assertEquals(canPassengerCancel("pending"), true);
  assertEquals(canPassengerCancel("accepted"), true);
  assertEquals(canPassengerCancel("driver_arrived"), true);
  assertEquals(canPassengerCancel("picked_up"), false);
  assertEquals(canPassengerCancel("completed"), false);
  assertEquals(canPassengerCancel("cancelled"), false);
});

Deno.test("VOP 2.5 — po vyzdvihnutí je refundácia blokovaná, admin ju môže riešiť", () => {
  assertEquals(isRefundBlocked("picked_up", false), true);
  assertEquals(isRefundBlocked("completed", false), true);
  assertEquals(isRefundBlocked("picked_up", true), false);
  assertEquals(isRefundBlocked("accepted", false), false);
});

Deno.test("VOP 2.1a — neskoré zrušenie len keď ruší pasažier po príchode vodiča", () => {
  assertEquals(isLateCancellation("driver_arrived", "passenger"), true);
  assertEquals(isLateCancellation("driver_arrived", "driver"), false);
  assertEquals(isLateCancellation("driver_arrived", "admin"), false);
  assertEquals(isLateCancellation("accepted", "passenger"), false);
});

Deno.test("VOP 2.1a — 50 % refundácia pri neskorom zrušení, inak 100 %", () => {
  assertEquals(resolveRefundPercent({ status: "driver_arrived", cancelledBy: "passenger" }), 50);
  assertEquals(
    resolveRefundPercent({ status: "driver_arrived", cancelledBy: "passenger", lateCancelPercentSetting: 30 }),
    30,
  );
  assertEquals(resolveRefundPercent({ status: "accepted", cancelledBy: "passenger" }), 100);
  assertEquals(resolveRefundPercent({ status: "driver_arrived", cancelledBy: "driver" }), 100);
});

Deno.test("nevalidné nastavenie percenta padá na default 50", () => {
  assertEquals(normalizeLateCancelPercent(null), 50);
  assertEquals(normalizeLateCancelPercent("abc"), 50);
  assertEquals(normalizeLateCancelPercent(-5), 50);
  assertEquals(normalizeLateCancelPercent(150), 50);
  assertEquals(normalizeLateCancelPercent(0), 0);
  assertEquals(normalizeLateCancelPercent(100), 100);
});

Deno.test("rozdelenie sumy: 50 % pasažierovi, 50 % vodičovi ako storno poplatok", () => {
  assertEquals(splitRefund(10, 50), { refundAmount: 5, compensation: 5 });
  assertEquals(splitRefund(7.5, 50), { refundAmount: 3.75, compensation: 3.75 });
  assertEquals(splitRefund(4.99, 50), { refundAmount: 2.5, compensation: 2.49 });
  assertEquals(splitRefund(10, 100), { refundAmount: 10, compensation: 0 });
  assertEquals(splitRefund(0, 50), { refundAmount: 0, compensation: 0 });
});

Deno.test("VOP 2.10 — výplata len pri overenom PIN", () => {
  assertEquals(isPayoutEligible({ pin_verified_at: "2026-08-13T10:00:00Z" }), true);
  assertEquals(isPayoutEligible({ pin_verified_at: null }), false);
  assertEquals(isPayoutEligible({}), false);
});

Deno.test("VOP 2.10 — ukončenie jazdy rozdelí pasažierov na výplatu a refundáciu", () => {
  const { toComplete, toRefund } = partitionOnRideEnd([
    { id: "a", status: "picked_up", pin_verified_at: "2026-08-13T10:00:00Z" },
    { id: "b", status: "driver_arrived", pin_verified_at: null },
    { id: "c", status: "accepted", pin_verified_at: null },
    { id: "d", status: "cancelled", pin_verified_at: null },
    { id: "e", status: "pending", pin_verified_at: null },
  ] as Array<{ id: string; status: string; pin_verified_at: string | null }>);

  assertEquals(toComplete.map((p) => p.id), ["a"]);
  assertEquals(toRefund.map((p) => p.id), ["b", "c"]);
});
