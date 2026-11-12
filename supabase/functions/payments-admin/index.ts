// Admin-only payment monitoring: configuration health check + manual reprocessing
// of failed Stripe checkout events.
import { corsHeaders, createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import { logPaymentEvent, processCheckoutSession, serviceClient } from "../_shared/ridePayment.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data.user) return null;
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  return isAdmin ? data.user : null;
}

function configHealth() {
  const has = (k: string) => !!Deno.env.get(k);
  return {
    sandbox: {
      api_key: has("STRIPE_SANDBOX_API_KEY"),
      webhook_secret: has("PAYMENTS_SANDBOX_WEBHOOK_SECRET"),
    },
    live: {
      api_key: has("STRIPE_LIVE_API_KEY"),
      webhook_secret: has("PAYMENTS_LIVE_WEBHOOK_SECRET"),
    },
    gateway_key: has("LOVABLE_API_KEY"),
    service_role: has("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = await requireAdmin(req);
  if (!admin) return json({ error: "Forbidden" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const action = body?.action;

  if (action === "health") {
    return json({ config: configHealth() });
  }

  if (action === "reprocess") {
    const eventId = body?.event_id;
    if (typeof eventId !== "string" || eventId.length < 10) {
      return json({ error: "Neplatné event_id" }, 400);
    }

    const supabase = serviceClient();
    const { data: ev, error } = await supabase
      .from("payment_events").select("*").eq("id", eventId).maybeSingle();
    if (error || !ev) return json({ error: "Záznam sa nenašiel" }, 404);

    const env: StripeEnv = ev.environment === "live" ? "live" : "sandbox";

    try {
      let session: any = ev.payload;
      if (ev.stripe_session_id) {
        const stripe = createStripeClient(env);
        session = await stripe.checkout.sessions.retrieve(ev.stripe_session_id);
      }
      if (!session) throw new Error("Chýbajú údaje o platbe (session)");

      const result = await processCheckoutSession(session);

      await supabase.from("payment_events").update({
        status: result === "duplicate" ? "duplicate" : "resolved",
        retry_count: (ev.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
        error_message: result === "duplicate" ? "Rezervácia už existuje" : null,
      }).eq("id", eventId);

      await logPaymentEvent({
        source: "payments-admin",
        event_type: "manual_reprocess",
        environment: env,
        status: "success",
        stripe_session_id: ev.stripe_session_id,
        ride_id: ev.ride_id,
        profile_id: ev.profile_id,
        amount: ev.amount,
        error_message: `Ručné spracovanie adminom (${result})`,
        resolved_at: new Date().toISOString(),
      });

      return json({ success: true, result });
    } catch (e) {
      const msg = (e as Error).message;
      await supabase.from("payment_events").update({
        retry_count: (ev.retry_count ?? 0) + 1,
        last_retry_at: new Date().toISOString(),
        error_message: msg,
      }).eq("id", eventId);
      return json({ error: msg }, 400);
    }
  }

  if (action === "resolve") {
    const eventId = body?.event_id;
    if (typeof eventId !== "string" || eventId.length < 10) {
      return json({ error: "Neplatné event_id" }, 400);
    }
    const supabase = serviceClient();
    const { error } = await supabase.from("payment_events")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) return json({ error: error.message }, 400);
    return json({ success: true });
  }

  if (action === "tax_export") {
    const month = String(body?.month ?? "");
    if (!/^\d{4}-\d{2}$/.test(month)) return json({ error: "Neplatný mesiac" }, 400);
    const env: StripeEnv = body?.environment === "sandbox" ? "sandbox" : "live";
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    try {
      const stripe = createStripeClient(env);
      const rows: any[] = [];
      for await (const c of stripe.charges.list({
        created: { gte: Math.floor(start.getTime() / 1000), lt: Math.floor(end.getTime() / 1000) },
        limit: 100,
      })) {
        if (c.status !== "succeeded" || !c.captured) continue;
        // Stripe reports money in integer cents — keep cents as the source of truth.
        const capturedCents = Math.round(c.amount_captured ?? c.amount ?? 0);
        const refundedCents = Math.round(c.amount_refunded ?? 0);
        const netCents = Math.max(0, capturedCents - refundedCents);
        rows.push({
          id: c.id,
          created: new Date(c.created * 1000).toISOString(),
          amount: capturedCents / 100,
          refunded: refundedCents / 100,
          net: netCents / 100,
          amount_cents: capturedCents,
          refunded_cents: refundedCents,
          net_cents: netCents,
          currency: c.currency,
          customer_name: c.billing_details?.name ?? null,
          customer_email: c.billing_details?.email ?? c.receipt_email ?? null,
          description: c.description ?? null,
          payment_intent: typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id ?? null,
          receipt_url: c.receipt_url ?? null,
          ride_id: c.metadata?.ride_id ?? c.metadata?.rideId ?? null,
        });
      }
      return json({ rows });
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  }

  return json({ error: "Neznáma akcia" }, 400);
});
