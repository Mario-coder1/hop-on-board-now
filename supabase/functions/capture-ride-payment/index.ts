// Strhne zablokovaný rezervačný poplatok po overení nástupu (PIN).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { request_id, environment } = await req.json();
    if (typeof request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(request_id)) return json({ error: "Invalid request_id" }, 400);
    if (environment !== "sandbox" && environment !== "live") return json({ error: "Invalid environment" }, 400);
    const env: StripeEnv = environment;

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await supabase.auth.getUser(token);
    if (!u?.user) return json({ error: "Unauthorized" }, 401);
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", u.user.id).single();

    const { data: rr } = await supabase.from("ride_requests")
      .select("id, passenger_id, payment_status, payment_captured_at, pin_verified_at, stripe_payment_intent_id, ride:rides(driver_id)")
      .eq("id", request_id).single();
    if (!rr) return json({ error: "Not found" }, 404);
    const driverId = (rr.ride as any)?.driver_id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!(profile && (profile.id === driverId || profile.id === rr.passenger_id)) && isAdmin !== true) {
      return json({ error: "Forbidden" }, 403);
    }
    if (rr.payment_captured_at || rr.payment_status !== "paid" || !rr.stripe_payment_intent_id) return json({ success: true, skipped: true });
    if (!rr.pin_verified_at) return json({ error: "Nástup ešte nebol overený" }, 400);

    const stripe = createStripeClient(env);
    const pi = await stripe.paymentIntents.retrieve(rr.stripe_payment_intent_id);
    if (pi.status === "requires_capture") await stripe.paymentIntents.capture(pi.id);
    await supabase.from("ride_requests").update({ payment_captured_at: new Date().toISOString() }).eq("id", request_id);
    if (driverId) {
      const amount = ((pi.amount_received || pi.amount || 0) / 100).toFixed(2);
      const title = "Rezervačný poplatok strhnutý";
      const message = `Nástup cestujúceho overený, poplatok ${amount} € bol strhnutý. Cenu úseku ti cestujúci zaplatí v hotovosti.`;
      try {
        await supabase.from("notifications").insert({ profile_id: driverId, title, message });
        await supabase.rpc("send_push_via_edge", { _profile_id: driverId, _title: title, _body: message, _data: { request_id } });
      } catch (err) { console.error("notify driver failed", err); }
    }
    return json({ success: true });
  } catch (e) {
    console.error("capture error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
