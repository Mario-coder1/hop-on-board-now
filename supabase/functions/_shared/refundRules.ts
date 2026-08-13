// Jediný zdroj pravdy pre pravidlá zrušenia a výplat (VOP čl. 2).
// Pure funkcie bez Deno/DOM API — importuje ich edge funkcia aj frontend, testované v oboch.

export const DEFAULT_LATE_CANCEL_REFUND_PERCENT = 50;

/** Stavy, v ktorých môže pasažier zrušiť rezerváciu (VOP 2.1, 2.1a). */
export const PASSENGER_CANCELLABLE_STATUSES = ["pending", "accepted", "driver_arrived"] as const;

/** Po vyzdvihnutí je jazda poskytnutá — refundáciu môže riešiť len admin (VOP 2.5, 2.7). */
export const SERVICE_PROVIDED_STATUSES = ["picked_up", "completed"] as const;

export type CancelledBy = "passenger" | "driver" | "admin";

export function canPassengerCancel(status: string): boolean {
  return (PASSENGER_CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

export function isServiceProvided(status: string): boolean {
  return (SERVICE_PROVIDED_STATUSES as readonly string[]).includes(status);
}

/** VOP 2.5 — refundácia po vyzdvihnutí je zakázaná pre všetkých okrem admina. */
export function isRefundBlocked(status: string, isAdmin: boolean): boolean {
  return isServiceProvided(status) && !isAdmin;
}

/** Neskoré zrušenie = pasažier ruší, keď vodič už dorazil (VOP 2.1a). */
export function isLateCancellation(status: string, cancelledBy: CancelledBy): boolean {
  return cancelledBy === "passenger" && status === "driver_arrived";
}

export function normalizeLateCancelPercent(value: unknown): number {
  if (value === null || value === undefined || value === "") return DEFAULT_LATE_CANCEL_REFUND_PERCENT;
  const pct = Number(value);
  return Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : DEFAULT_LATE_CANCEL_REFUND_PERCENT;
}

export function resolveRefundPercent(opts: {
  status: string;
  cancelledBy: CancelledBy;
  lateCancelPercentSetting?: unknown;
}): number {
  if (!isLateCancellation(opts.status, opts.cancelledBy)) return 100;
  return normalizeLateCancelPercent(opts.lateCancelPercentSetting);
}

/** Rozdelenie uhradenej sumy na refundáciu pasažierovi a kompenzáciu vodičovi. */
export function splitRefund(amountPaid: number, refundPercent: number): {
  refundAmount: number;
  compensation: number;
} {
  const paid = Number.isFinite(Number(amountPaid)) ? Number(amountPaid) : 0;
  const refundAmount = Math.round(paid * refundPercent) / 100;
  const compensation = Math.round((paid - refundAmount) * 100) / 100;
  return { refundAmount, compensation };
}

/** VOP 2.10 — vodičovi sa vyplatí len ak bol PIN overený. */
export function isPayoutEligible(request: { pin_verified_at?: string | null }): boolean {
  return !!request.pin_verified_at;
}

/**
 * VOP 2.10 — pri ukončení jazdy: overení pasažieri → completed (výplata),
 * neoverení → zrušenie + 100 % refundácia.
 */
export function partitionOnRideEnd<T extends { status: string; pin_verified_at?: string | null }>(
  passengers: T[],
): { toComplete: T[]; toRefund: T[] } {
  const active = passengers.filter((p) => ["accepted", "driver_arrived", "picked_up"].includes(p.status));
  return {
    toComplete: active.filter((p) => isPayoutEligible(p)),
    toRefund: active.filter((p) => !isPayoutEligible(p)),
  };
}
