// Refund a ride payment. Called when driver rejects, or passenger/driver cancels.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { request_id, environment } = await req.json();
    if (!request_id) return new Response(JSON.stringify({ error: "Missing request_id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Invalid environment" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const env: StripeEnv = environment;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: profile } = await supabase
      .from("profiles").select("id").eq("user_id", userData.user.id).single();
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const { data: rr } = await supabase
      .from("ride_requests")
      .select("id, passenger_id, payment_status, stripe_payment_intent_id, amount_paid, payout_released_at, ride:rides(driver_id)")
      .eq("id", request_id).single();
    if (!rr) return new Response(JSON.stringify({ error: "Request not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Check authorization: driver of the ride, the passenger, or admin
    const driverId = (rr.ride as any)?.driver_id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    const allowed = rr.passenger_id === profile.id || driverId === profile.id || isAdmin === true;
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    if (rr.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Nie je čo refundovať" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rr.payout_released_at) {
      return new Response(JSON.stringify({ error: "Peniaze už boli vyplatené vodičovi" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!rr.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ error: "Chýba payment intent" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(env);
    const refund = await stripe.refunds.create({
      payment_intent: rr.stripe_payment_intent_id,
    });

    await supabase.from("ride_requests").update({
      payment_status: "refunded",
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
    }).eq("id", request_id);

    return new Response(JSON.stringify({ success: true, refund_id: refund.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refund error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
