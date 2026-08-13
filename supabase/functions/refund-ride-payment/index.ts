// Refund a ride payment. Called when driver rejects, or passenger/driver cancels.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { request_id, environment, reason } = await req.json();
    const cancellationReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
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
      .select("id, passenger_id, status, payment_status, stripe_payment_intent_id, amount_paid, payout_released_at, ride:rides(driver_id)")
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

    // VOP čl. 2.5 — po vyzdvihnutí je jazda poskytnutá, refundáciu môže riešiť len admin (reklamácia, čl. 2.7)
    if (["picked_up", "completed"].includes(String(rr.status)) && isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Jazda už bola poskytnutá — refundácia nie je možná (VOP čl. 2.5). Reklamáciu pošlite na support@takeme.sk." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


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

    // VOP čl. 2.3 — zrušenie pasažierom po tom, čo vodič už prišiel na miesto:
    // refunduje sa len časť, zvyšok patrí vodičovi ako kompenzácia za zbytočnú cestu.
    const isPassengerCanceller = rr.passenger_id === profile.id;
    const lateCancel = isPassengerCanceller && String(rr.status) === "driver_arrived";

    let refundPercent = 100;
    if (lateCancel) {
      const { data: setting } = await supabase
        .from("platform_settings").select("value").eq("key", "late_cancel_refund_percent").maybeSingle();
      const pct = Number(setting?.value);
      refundPercent = Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 50;
    }

    const amountPaid = Number(rr.amount_paid ?? 0);
    const refundAmount = Math.round(amountPaid * refundPercent) / 100;
    const compensation = Math.round((amountPaid - refundAmount) * 100) / 100;

    const stripe = createStripeClient(env);
    const refundMetadata = {
      request_id: String(request_id),
      cancelled_by: isPassengerCanceller ? "passenger" : (driverId === profile.id ? "driver" : "admin"),
      refund_percent: String(refundPercent),
      ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
    };

    const refund = await stripe.refunds.create({
      payment_intent: rr.stripe_payment_intent_id,
      ...(refundPercent < 100 ? { amount: Math.round(refundAmount * 100) } : {}),
      metadata: refundMetadata,
    });

    if (cancellationReason) {
      try {
        await stripe.paymentIntents.update(rr.stripe_payment_intent_id, {
          metadata: { cancellation_reason: cancellationReason },
        });
      } catch (e) {
        console.error("pi metadata update failed", e);
      }
    }

    // Kompenzácia vodičovi pri neskorom zrušení
    if (compensation > 0 && driverId) {
      try {
        let { data: wallet } = await supabase
          .from("wallets").select("id, balance").eq("profile_id", driverId).maybeSingle();
        if (!wallet) {
          const { data: created } = await supabase
            .from("wallets").insert({ profile_id: driverId }).select("id, balance").single();
          wallet = created;
        }
        if (wallet) {
          await supabase.from("wallets")
            .update({ balance: Number(wallet.balance ?? 0) + compensation }).eq("id", wallet.id);
          await supabase.from("transactions").insert({
            wallet_id: wallet.id,
            type: "cancellation_fee",
            amount: compensation,
            description: "Kompenzácia za neskoré zrušenie pasažierom (vodič už bol na mieste)",
          });
        }
      } catch (e) {
        console.error("compensation error", e);
      }
    }

    await supabase.from("ride_requests").update({
      payment_status: refundPercent < 100 ? "partially_refunded" : "refunded",
      stripe_refund_id: refund.id,
      refunded_at: new Date().toISOString(),
      ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
    }).eq("id", request_id);

    return new Response(JSON.stringify({
      success: true,
      refund_id: refund.id,
      refund_percent: refundPercent,
      refunded_amount: refundAmount,
      driver_compensation: compensation,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("refund error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
