// Stripe webhook handler — on successful payment, creates the ride_request row
// (which triggers existing notify_new_ride_request push to driver).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const meta = session.metadata || {};
  if (meta.kind !== "ride_payment") {
    console.log("Skipping non-ride payment, kind:", meta.kind);
    return;
  }

  const supabase = getSupabase();

  // Idempotency: skip if we already have a request for this session id
  const { data: existing } = await supabase
    .from("ride_requests")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) {
    console.log("Already processed session", session.id);
    return;
  }

  const amountPaid = (session.amount_total ?? 0) / 100;
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  const { error } = await supabase.from("ride_requests").insert({
    ride_id: meta.ride_id,
    passenger_id: meta.passenger_profile_id,
    pickup_address: meta.pickup_address,
    pickup_lat: Number(meta.pickup_lat),
    pickup_lng: Number(meta.pickup_lng),
    dropoff_address: meta.dropoff_address || null,
    dropoff_lat: meta.dropoff_lat ? Number(meta.dropoff_lat) : null,
    dropoff_lng: meta.dropoff_lng ? Number(meta.dropoff_lng) : null,
    message: meta.message || null,
    status: "pending",
    payment_status: "paid",
    stripe_session_id: session.id,
    stripe_payment_intent_id: pi || null,
    amount_paid: amountPaid,
    price_per_seat_snapshot: meta.price_per_seat ? Number(meta.price_per_seat) : null,
    currency: (session.currency || "eur").toLowerCase(),
    paid_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to insert ride_request after payment:", error);
    throw error;
  }
  console.log("Created paid ride request for session", session.id);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
      case "transaction.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      default:
        console.log("Unhandled:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(`Webhook error: ${(e as Error).message}`, { status: 400 });
  }
});
