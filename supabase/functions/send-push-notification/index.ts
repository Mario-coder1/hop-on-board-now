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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { profile_id, title, body, data, tag } = await req.json() as PushPayload;

    console.log(`[Push] Sending notification to profile: ${profile_id}`);
    console.log(`[Push] Title: ${title}, Body: ${body}`);

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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
