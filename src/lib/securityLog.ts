import { supabase } from "@/integrations/supabase/client";

export type SecurityEventType =
  | "login"
  | "login_failed"
  | "logout"
  | "signup"
  | "password_reset_requested"
  | "password_changed";

/**
 * Zapíše bezpečnostnú audit udalosť (prihlásenie, zmena hesla, reset...).
 * Nikdy nevyhodí chybu — logovanie nesmie blokovať používateľa.
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  options: { status?: "success" | "failed"; email?: string | null; detail?: string | null } = {},
): Promise<void> {
  try {
    await supabase.rpc("log_security_event", {
      _event_type: eventType,
      _status: options.status ?? "success",
      _email: options.email ?? null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _detail: options.detail ?? null,
    });
  } catch {
    // ticho ignorujeme
  }
}
