import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys
const VAPID_PUBLIC_KEY = 'BNlR7VxH3G8jE4o8z2bF3pK5cQ9wY1nM6vS0hX4tA7iU2dL8rO9sP5jN3kW1yZ6mE8xC0bV4gF2aH7qJ5uT9oI3';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// Configure web-push with VAPID details
webpush.setVapidDetails(
  'mailto:takeme-app@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

interface PushPayload {
  profile_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token for authorization check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Push] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('[Push] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { profile_id, title, body, data, tag } = await req.json() as PushPayload;

    // Validate inputs
    if (!profile_id || typeof profile_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid profile_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!title || title.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid title (max 100 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body || body.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid body (max 500 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] User ${user.id} requesting notification to profile: ${profile_id}`);
    console.log(`[Push] Title: ${title}, Body: ${body}`);

    // Get caller's profile
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!callerProfile) {
      console.error('[Push] Caller profile not found');
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: Check if caller has active ride relationship with target
    // Either as driver with target as passenger, or as passenger with target as driver
    const { data: hasRelationship } = await supabase
      .from('ride_requests')
      .select(`
        id,
        ride:rides!inner(driver_id)
      `)
      .in('status', ['pending', 'accepted', 'driver_arrived', 'picked_up'])
      .or(`passenger_id.eq.${profile_id},ride.driver_id.eq.${profile_id}`)
      .or(`passenger_id.eq.${callerProfile.id},ride.driver_id.eq.${callerProfile.id}`)
      .limit(1);

    // Also check if caller is driver of any ride with target as passenger or vice versa
    const { data: driverRelation } = await supabase
      .from('rides')
      .select(`
        id,
        ride_requests!inner(passenger_id)
      `)
      .eq('driver_id', callerProfile.id)
      .eq('ride_requests.passenger_id', profile_id)
      .in('ride_requests.status', ['pending', 'accepted', 'driver_arrived', 'picked_up'])
      .limit(1);

    const { data: passengerRelation } = await supabase
      .from('rides')
      .select(`
        id,
        ride_requests!inner(passenger_id)
      `)
      .eq('driver_id', profile_id)
      .eq('ride_requests.passenger_id', callerProfile.id)
      .in('ride_requests.status', ['pending', 'accepted', 'driver_arrived', 'picked_up'])
      .limit(1);

    const isAuthorized = (driverRelation && driverRelation.length > 0) || 
                         (passengerRelation && passengerRelation.length > 0) ||
                         callerProfile.id === profile_id; // Can notify self

    if (!isAuthorized) {
      console.error('[Push] Unauthorized: No active ride relationship');
      return new Response(
        JSON.stringify({ error: 'Not authorized to notify this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Push] Authorization passed');

    // Get all subscriptions for this profile
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id);

    if (subError) {
      console.error('[Push] Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No subscriptions found for profile');
      return new Response(
        JSON.stringify({ success: false, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s)`);

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || {},
      tag: tag || 'takeme-notification'
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          console.log(`[Push] Sending to endpoint: ${sub.endpoint.substring(0, 50)}...`);

          const result = await webpush.sendNotification(pushSubscription, payload);
          
          console.log(`[Push] Success! Status: ${result.statusCode}`);
          return { success: true, statusCode: result.statusCode };
        } catch (error: any) {
          console.error('[Push] Error sending notification:', error.message);
          
          // If subscription is expired or invalid (410 Gone or 404 Not Found), remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[Push] Subscription expired/invalid, removing...');
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, error: error.message, statusCode: error.statusCode };
        }
      })
    );

    console.log('[Push] Results:', JSON.stringify(results));

    const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;

    return new Response(
      JSON.stringify({ 
        success: successCount > 0, 
        sent: successCount,
        total: subscriptions.length,
        results 
      }),
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
