// Sends a push notification to ALL users with active push subscriptions.
// Admin-only: caller must be authenticated AND have the 'admin' role.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MassPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tag?: string;
}

const VAPID_PUB = 'BJvuHuOuT9RaGband3V0sHNlQdlOrdJ5SLk2l45kt5pOw29dgC8LvVVBLiM8fqHHU-tShI-f5zmW8EMYC9kcAxU';
const VAPID_PRIV = 'dB9LHo1BQwD-kaRgCgdM4Y-YeHX_ggdycjkpGHKDy-w';

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

    // Verify the caller is an authenticated admin.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) {
      console.warn('[MassPush] caller is not admin', { roleErr });
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, body, data, tag } = await req.json() as MassPushPayload;
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails('mailto:support@takeme.sk', VAPID_PUB, VAPID_PRIV);

    // Load every push subscription in the system.
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, profile_id');

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[MassPush] No subscriptions in system');
      return new Response(
        JSON.stringify({ success: true, sent: 0, total: 0, recipients: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueProfiles = new Set(subscriptions.map((s) => s.profile_id)).size;
    console.log(`[MassPush] Sending to ${subscriptions.length} subscription(s) across ${uniqueProfiles} user(s)`);

    // Use a unique tag per broadcast so each mass notification stays visible
    // separately (the previous one isn't replaced/collapsed by the OS).
    const uniqueTag = `${tag || 'takeme-mass-notification'}-${Date.now()}`;
    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || { type: 'mass_notification' },
      tag: uniqueTag,
      requireInteraction: true,
    });

    const expiredIds: string[] = [];
    let sent = 0;

    // Process in batches of 50 to keep memory + concurrency reasonable.
    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.all(batch.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 86400, urgency: 'high', contentEncoding: 'aes128gcm' }
          );
          sent++;
        } catch (e) {
          const statusCode = (e as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(sub.id);
          } else {
            console.error('[MassPush] error sending:', statusCode, (e as Error)?.message);
          }
        }
      }));
    }

    // Cleanup dead subscriptions.
    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
      console.log(`[MassPush] Removed ${expiredIds.length} expired subscription(s)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total: subscriptions.length,
        recipients: uniqueProfiles,
        expired: expiredIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[MassPush] fatal:', e);
    return new Response(
      JSON.stringify({ error: (e as Error)?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
