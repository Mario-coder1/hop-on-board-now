// Stripe webhook handler — on successful payment, creates the ride_request row
// (which triggers existing notify_new_ride_request push to driver).
// Every event (and every failure) is logged into public.payment_events so admins
// can monitor and manually reprocess.
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";
import { logPaymentEvent, processCheckoutSession } from "../_shared/ridePayment.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    await logPaymentEvent({
      source: "payments-webhook",
      event_type: "invalid_env",
      status: "error",
      error_message: `Neplatný parameter env: ${rawEnv ?? "chýba"}`,
    });
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  let event: { type: string; data: { object: any }; id?: string } | null = null;

  try {
    event = await verifyWebhook(req, env) as any;
    console.log("Webhook event:", event!.type);

    switch (event!.type) {
      case "checkout.session.completed":
      case "transaction.completed": {
        const session = event!.data.object;
        try {
          const result = await processCheckoutSession(session);
          await logPaymentEvent({
            source: "payments-webhook",
            event_type: event!.type,
            environment: env,
            status: result === "duplicate" ? "duplicate" : "success",
            stripe_event_id: event!.id ?? null,
            stripe_session_id: session?.id ?? null,
            ride_id: session?.metadata?.ride_id ?? null,
            profile_id: session?.metadata?.passenger_profile_id ?? null,
            amount: (session?.amount_total ?? 0) / 100,
            resolved_at: new Date().toISOString(),
          });
        } catch (e) {
          await logPaymentEvent({
            source: "payments-webhook",
            event_type: event!.type,
            environment: env,
            status: "error",
            stripe_event_id: event!.id ?? null,
            stripe_session_id: session?.id ?? null,
            ride_id: session?.metadata?.ride_id ?? null,
            profile_id: session?.metadata?.passenger_profile_id ?? null,
            amount: (session?.amount_total ?? 0) / 100,
            error_message: (e as Error).message,
            payload: session,
          });
          throw e;
        }
        break;
      }
      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const obj = event!.data.object;
        await logPaymentEvent({
          source: "payments-webhook",
          event_type: event!.type,
          environment: env,
          status: "error",
          stripe_event_id: event!.id ?? null,
          stripe_session_id: obj?.id ?? null,
          ride_id: obj?.metadata?.ride_id ?? null,
          profile_id: obj?.metadata?.passenger_profile_id ?? null,
          amount: (obj?.amount_total ?? obj?.amount ?? 0) / 100,
          error_message: obj?.last_payment_error?.message || "Platba neprešla / session expirovala",
          payload: obj,
        });
        break;
      }
      default:
        console.log("Unhandled:", event!.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    if (!event) {
      await logPaymentEvent({
        source: "payments-webhook",
        event_type: "verification_failed",
        environment: env,
        status: "error",
        error_message: (e as Error).message,
      });
    }
    return new Response(`Webhook error: ${(e as Error).message}`, { status: 400 });
  }
});
