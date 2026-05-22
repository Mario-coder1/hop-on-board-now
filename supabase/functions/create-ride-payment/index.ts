// Creates a Stripe Embedded Checkout session for a ride request.
// Flow: passenger fills pickup/dropoff -> calls this -> pays in Stripe form
// -> on transaction.completed the webhook inserts the ride_request row.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      ride_id, pickup_address, pickup_lat, pickup_lng,
      dropoff_address, dropoff_lat, dropoff_lng,
      message, environment, return_url,
    } = body;

    if (!ride_id || !pickup_address || pickup_lat == null || pickup_lng == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Invalid environment" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const env: StripeEnv = environment;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile + ride to compute price
    const { data: profile } = await supabase
      .from("profiles").select("id, full_name").eq("user_id", userData.user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ride } = await supabase
      .from("rides").select("id, price_per_seat, available_seats, status, origin_address, destination_address, driver_id")
      .eq("id", ride_id).single();
    if (!ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ride.driver_id === profile.id) {
      return new Response(JSON.stringify({ error: "Nemôžete rezervovať vlastnú jazdu" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ride.available_seats <= 0 || !["active", "in_progress"].includes(ride.status)) {
      return new Response(JSON.stringify({ error: "Jazda nie je dostupná" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already requested?
    const { data: existing } = await supabase
      .from("ride_requests").select("id, payment_status, status")
      .eq("ride_id", ride_id).eq("passenger_id", profile.id).maybeSingle();
    if (existing && existing.payment_status === "paid" && existing.status !== "rejected" && existing.status !== "cancelled") {
      return new Response(JSON.stringify({ error: "Už ste si túto jazdu rezervovali" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(Number(ride.price_per_seat) * 100);
    if (!amountCents || amountCents < 50) {
      return new Response(JSON.stringify({ error: "Suma musí byť aspoň 0.50 €" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(env);
    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: `Jazda: ${ride.origin_address} → ${ride.destination_address}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url,
      customer_email: userData.user.email,
      payment_intent_data: {
        description: `Rezervácia jazdy`,
        metadata: {
          ride_id, passenger_profile_id: profile.id,
        },
      },
      metadata: {
        kind: "ride_payment",
        ride_id,
        passenger_profile_id: profile.id,
        passenger_user_id: userData.user.id,
        pickup_address,
        pickup_lat: String(pickup_lat),
        pickup_lng: String(pickup_lng),
        dropoff_address: dropoff_address || "",
        dropoff_lat: dropoff_lat != null ? String(dropoff_lat) : "",
        dropoff_lng: dropoff_lng != null ? String(dropoff_lng) : "",
        message: (message || "").slice(0, 400),
        price_per_seat: String(ride.price_per_seat),
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-ride-payment error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
