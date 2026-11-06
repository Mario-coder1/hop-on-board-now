export function notificationLink(notificationId: string): string {
  return `/profile?notification=${encodeURIComponent(notificationId)}`;
}
const RIDE_LINK = /\/ride\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Ride page linked inside a notification message (e.g. driver offered a ride). */
export function rideLinkFromMessage(message: string): string | null {
  const m = message.match(RIDE_LINK);
  return m ? `/ride/${m[1]}` : null;
}

/** Message without the technical "Otvor: /ride/…" suffix. */
export function stripRideLink(message: string): string {
  return message.replace(/\s*Otvor:\s*\/ride\/[0-9a-f-]{36}/i, '').trim();
}
