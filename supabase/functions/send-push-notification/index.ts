import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys - generated for this project
const VAPID_PUBLIC_KEY = 'BNlR7VxH3G8jE4o8z2bF3pK5cQ9wY1nM6vS0hX4tA7iU2dL8rO9sP5jN3kW1yZ6mE8xC0bV4gF2aH7qJ5uT9oI3';
const VAPID_PRIVATE_KEY = 'kX9mN3vS7wY1zA4bC8dE2fG6hI0jK5lM9nO3pQ7rS1tU';

interface PushPayload {
  profile_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

async function sendPushNotification(subscription: any, payload: any) {
  const vapidHeaders = {
    alg: 'ES256',
    typ: 'JWT'
  };

  // Simple push notification using fetch
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: JSON.stringify(payload)
  });

  return response;
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

    const payload = {
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || {},
      tag: tag || 'takeme-notification'
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Use Web Push protocol
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          // For now, we'll use a simple approach - in production you'd use web-push library
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
            },
          });

          if (!response.ok && response.status === 410) {
            // Subscription expired, remove it
            console.log('[Push] Subscription expired, removing...');
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }

          return { success: response.ok, status: response.status };
        } catch (error) {
          console.error('[Push] Error sending to subscription:', error);
          return { success: false, error: (error as Error).message };
        }
      })
    );

    console.log('[Push] Results:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
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
