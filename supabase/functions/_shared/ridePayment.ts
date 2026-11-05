// Shared logic: create the ride_request row from a paid Stripe checkout session.
// Used by payments-webhook and by admin manual reprocessing.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from './stripe.ts';

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function logPaymentEvent(row: Record<string, unknown>) {
  try {
    const supabase = serviceClient();
    await supabase.from("payment_events").insert(row);
  } catch (e) {
    console.error("Failed to log payment event:", e);
  }
}

/** Returns "created" | "duplicate". Throws on failure. */
export async function processCheckoutSession(session: any): Promise<"created" | "duplicate"> {
  const meta = session?.metadata || {};
  if (meta.kind !== "ride_payment") {
    throw new Error(`Not a ride payment (kind: ${meta.kind ?? "none"})`);
  }
  if (!meta.ride_id || !meta.passenger_profile_id || !meta.pickup_address) {
    throw new Error("Chýbajú metadáta platby (ride_id / passenger_profile_id / pickup_address)");
  }

  const supabase = serviceClient();

  const { data: existing } = await supabase
    .from("ride_requests")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return "duplicate";

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
    // Pri blokácii (capture_method manual) je session.payment_status "unpaid".
    payment_captured_at: session.payment_status === "paid" ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.message.includes('Vodič podľa poslednej uloženej polohy') && pi) {
      const stripe = createStripeClient(session.livemode ? 'live' : 'sandbox');
      const intent = await stripe.paymentIntents.retrieve(pi);
      if (intent.status === 'requires_capture') {
        await stripe.paymentIntents.cancel(pi, {}, { idempotencyKey: `passed-pickup-cancel-${session.id}` });
      } else if (intent.status === 'succeeded') {
        await stripe.refunds.create({ payment_intent: pi }, { idempotencyKey: `passed-pickup-refund-${session.id}` });
      }
      await logPaymentEvent({ source: 'passed-pickup-guard', event_type: 'booking_unavailable_fee_returned',
        environment: session.livemode ? 'live' : 'sandbox', status: 'success', stripe_session_id: session.id,
        ride_id: meta.ride_id, profile_id: meta.passenger_profile_id, amount: amountPaid,
        resolved_at: new Date().toISOString() });
    }
    throw new Error(error.message);
  }
  return "created";
}
