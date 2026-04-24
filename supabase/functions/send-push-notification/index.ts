import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  profile_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

async function sendWebPush(
  supabaseUrl: string,
  internalSecret: string,
  payload: PushPayload
): Promise<Response> {
  return fetch(`${supabaseUrl}/functions/v1/internal-send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify(payload),
  });
}

// --- Main Handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BNhAdOr-WSdStFchoXGKtkQCfhv3JpoMBEgA433DV3tDLSxKwYvZwFwDZpCoKvfu_WCK7qdRXmWUleRf9n-JsEM';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPrivateKey) {
      console.error('[Push] VAPID_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const isServerCall = token === supabaseServiceKey;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authorize: either server-side (trigger) or authenticated user with valid relationship
    if (!isServerCall) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { profile_id } = await req.clone().json() as PushPayload;

      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!callerProfile) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Authorization: Check ride relationship
      const { data: driverRelation } = await supabase
        .from('rides')
        .select('id, ride_requests!inner(passenger_id)')
        .eq('driver_id', callerProfile.id)
        .eq('ride_requests.passenger_id', profile_id)
        .in('ride_requests.status', ['pending', 'accepted', 'driver_arrived', 'picked_up', 'completed'])
        .limit(1);

      const { data: passengerRelation } = await supabase
        .from('rides')
        .select('id, ride_requests!inner(passenger_id)')
        .eq('driver_id', profile_id)
        .eq('ride_requests.passenger_id', callerProfile.id)
        .in('ride_requests.status', ['pending', 'accepted', 'driver_arrived', 'picked_up', 'completed'])
        .limit(1);

      const isAuthorized = (driverRelation && driverRelation.length > 0) ||
                           (passengerRelation && passengerRelation.length > 0) ||
                           callerProfile.id === profile_id;

      if (!isAuthorized) {
        return new Response(
          JSON.stringify({ error: 'Not authorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { profile_id, title, body, data, tag } = await req.json() as PushPayload;

    if (!profile_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] Sending to profile: ${profile_id}, title: ${title}, server: ${isServerCall}`);


    // Get all subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found');
      return new Response(
        JSON.stringify({ success: false, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s)`);

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || {},
      tag: tag || 'takeme-notification',
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      try {
        const response = await sendWebPush(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          notificationPayload,
          vapidPublicKey,
          vapidPrivateKey
        );

        if (response.status === 201 || response.status === 200) {
          sent++;
          console.log(`[Push] Sent successfully to ${sub.endpoint.substring(0, 50)}...`);
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          console.log(`[Push] Subscription expired, removing: ${sub.id}`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          const errorBody = await response.text();
          console.error(`[Push] Failed with status ${response.status}: ${errorBody}`);
          errors.push(`${response.status}: ${errorBody}`);
        }
      } catch (error) {
        console.error(`[Push] Error sending to subscription ${sub.id}:`, error);
        errors.push(String(error));
      }
    }

    return new Response(
      JSON.stringify({ success: sent > 0, sent, total: subscriptions.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Vyskytla sa chyba. Skúste to znova.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
