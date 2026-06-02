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
      .from("rides").select("id, price_per_seat, available_seats, status, origin_address, destination_address, driver_id, origin_lat, origin_lng, destination_lat, destination_lng, route_polyline")
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

    // Proportional pricing: charge passenger for the portion of the route they use.
    // Platform commission is ADDED ON TOP of the driver's price.
    const EARTH = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const haversine = (a: [number, number], b: [number, number]) => {
      const dLat = toRad(b[1] - a[1]); const dLng = toRad(b[0] - a[0]);
      const la1 = toRad(a[1]); const la2 = toRad(b[1]);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
      return 2 * EARTH * Math.asin(Math.sqrt(h));
    };
    let route: [number, number][] | null = null;
    try {
      if (ride.route_polyline) {
        const p = JSON.parse(ride.route_polyline);
        if (Array.isArray(p) && p.length > 1 && Array.isArray(p[0]) && p[0].length === 2) route = p;
      }
    } catch { /* ignore */ }
    const origin: [number, number] = [Number(ride.origin_lng), Number(ride.origin_lat)];
    const dest: [number, number] = [Number(ride.destination_lng), Number(ride.destination_lat)];
    const pickup: [number, number] = [Number(pickup_lng), Number(pickup_lat)];
    const hasDropoff = dropoff_lat != null && dropoff_lng != null;
    const dropoffPt: [number, number] | null = hasDropoff ? [Number(dropoff_lng), Number(dropoff_lat)] : null;

    let totalM = 0;
    let segmentM = 0;
    if (route) {
      const cum: number[] = [0];
      for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + haversine(route[i - 1], route[i]));
      totalM = cum[cum.length - 1];
      const closestIdx = (pt: [number, number]) => {
        let min = Infinity, idx = 0;
        for (let i = 0; i < route!.length; i++) {
          const d = haversine(pt, route![i]);
          if (d < min) { min = d; idx = i; }
        }
        return idx;
      };
      if (dropoffPt) {
        const a = closestIdx(pickup), b = closestIdx(dropoffPt);
        segmentM = Math.abs(cum[Math.max(a, b)] - cum[Math.min(a, b)]);
      } else {
        segmentM = totalM;
      }
    } else {
      totalM = haversine(origin, dest);
      segmentM = dropoffPt ? haversine(pickup, dropoffPt) : totalM;
    }

    // Fetch platform commission %
    const { data: commissionRow } = await supabase
      .from("platform_settings").select("value").eq("key", "ride_commission_percent").maybeSingle();
    const commissionPct = Number(commissionRow?.value ?? 10);

    const ratio = totalM > 0 ? Math.min(1, Math.max(0, segmentM / totalM)) : 1;
    const fullPrice = Number(ride.price_per_seat);
    const proportional = hasDropoff;
    const rawBase = proportional ? fullPrice * ratio : fullPrice;
    const basePrice = Math.round(rawBase * 100) / 100;        // driver portion
    const commission = Math.round(basePrice * commissionPct) / 100; // platform fee on top
    let chargedAmount = Math.round((basePrice + commission) * 100) / 100;
    if (chargedAmount < 0.5) chargedAmount = 0.5; // Stripe minimum
    const amountCents = Math.round(chargedAmount * 100);
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
            name: proportional && ratio < 1
              ? `Jazda: ${ride.origin_address} → ${ride.destination_address} (${(segmentM / 1000).toFixed(1)} km z ${(totalM / 1000).toFixed(1)} km)`
              : `Jazda: ${ride.origin_address} → ${ride.destination_address}`,
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
        base_price: String(basePrice),
        commission_amount: String(commission),
        commission_percent: String(commissionPct),
        charged_amount: String(chargedAmount),
        segment_km: (segmentM / 1000).toFixed(3),
        total_km: (totalM / 1000).toFixed(3),
        proportional: proportional ? "1" : "0",
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
