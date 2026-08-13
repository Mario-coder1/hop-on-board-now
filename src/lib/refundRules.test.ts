import { describe, it, expect } from "vitest";
import {
  DEFAULT_LATE_CANCEL_REFUND_PERCENT,
  canPassengerCancel,
  isLateCancellation,
  isPayoutEligible,
  isRefundBlocked,
  partitionOnRideEnd,
  resolveRefundPercent,
  splitRefund,
} from "@/lib/refundRules";

// Regresné testy pre pravidlá VOP čl. 2 — nesmú sa vrátiť späť.

describe("zrušenie pasažierom (VOP 2.1 / 2.5)", () => {
  it("povoluje zrušenie pred vyzdvihnutím", () => {
    expect(canPassengerCancel("pending")).toBe(true);
    expect(canPassengerCancel("accepted")).toBe(true);
    expect(canPassengerCancel("driver_arrived")).toBe(true);
  });

  it("blokuje zrušenie po vyzdvihnutí a po dokončení", () => {
    expect(canPassengerCancel("picked_up")).toBe(false);
    expect(canPassengerCancel("completed")).toBe(false);
  });

  it("po vyzdvihnutí je refundácia možná len pre admina", () => {
    expect(isRefundBlocked("picked_up", false)).toBe(true);
    expect(isRefundBlocked("picked_up", true)).toBe(false);
  });
});

describe("storno poplatok po príchode vodiča (VOP 2.1a)", () => {
  it("default je 50 % refundácia", () => {
    expect(DEFAULT_LATE_CANCEL_REFUND_PERCENT).toBe(50);
    expect(resolveRefundPercent({ status: "driver_arrived", cancelledBy: "passenger" })).toBe(50);
  });

  it("respektuje nastavenie platformy", () => {
    expect(
      resolveRefundPercent({ status: "driver_arrived", cancelledBy: "passenger", lateCancelPercentSetting: 40 }),
    ).toBe(40);
  });

  it("neaplikuje sa pri zrušení vodičom ani pred príchodom", () => {
    expect(isLateCancellation("driver_arrived", "driver")).toBe(false);
    expect(resolveRefundPercent({ status: "driver_arrived", cancelledBy: "driver" })).toBe(100);
    expect(resolveRefundPercent({ status: "accepted", cancelledBy: "passenger" })).toBe(100);
  });

  it("rozdelí sumu medzi pasažiera a vodiča", () => {
    expect(splitRefund(10, 50)).toEqual({ refundAmount: 5, compensation: 5 });
    expect(splitRefund(4.99, 50)).toEqual({ refundAmount: 2.5, compensation: 2.49 });
    expect(splitRefund(12, 100)).toEqual({ refundAmount: 12, compensation: 0 });
  });
});

describe("výplata len pri PIN overení (VOP 2.10)", () => {
  it("bez PINu nie je nárok na výplatu", () => {
    expect(isPayoutEligible({ pin_verified_at: null })).toBe(false);
    expect(isPayoutEligible({ pin_verified_at: "2026-08-13T10:00:00Z" })).toBe(true);
  });

  it("pri ukončení jazdy: overení sa dokončia, neoverení sa refundujú", () => {
    const { toComplete, toRefund } = partitionOnRideEnd([
      { id: "verified", status: "picked_up", pin_verified_at: "2026-08-13T10:00:00Z" },
      { id: "arrived-no-pin", status: "driver_arrived", pin_verified_at: null },
      { id: "accepted-no-pin", status: "accepted", pin_verified_at: null },
      { id: "cancelled", status: "cancelled", pin_verified_at: null },
    ]);
    expect(toComplete.map((p) => p.id)).toEqual(["verified"]);
    expect(toRefund.map((p) => p.id)).toEqual(["arrived-no-pin", "accepted-no-pin"]);
  });
});
