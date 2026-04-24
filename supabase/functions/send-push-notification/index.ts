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

    const { data: secretValue, error: secretErr } = await supabase.rpc('get_internal_push_secret' as never);
    if (secretErr || !secretValue) {
      console.error('[Push] Failed to load internal push secret', secretErr);
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await sendWebPush(supabaseUrl, secretValue as string, {
      profile_id,
      title,
      body,
      data,
      tag,
    });

    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Vyskytla sa chyba. Skúste to znova.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
