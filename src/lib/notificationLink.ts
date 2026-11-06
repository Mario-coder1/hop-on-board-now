export function notificationLink(notificationId: string): string {
  return `/profile?notification=${encodeURIComponent(notificationId)}`;
}