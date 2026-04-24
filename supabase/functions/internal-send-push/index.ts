// Internal-only edge function called by DB triggers via pg_net.
// Authorization: requires X-Internal-Secret header matching internal_push_secret app config.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

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
    // VAPID keypair generated via Web Crypto (ECDSA P-256). Public key must
    // match VAPID_PUBLIC_KEY in src/hooks/usePushNotifications.ts.
    const vapidPub = 'BJvuHuOuT9RaGband3V0sHNlQdlOrdJ5SLk2l45kt5pOw29dgC8LvVVBLiM8fqHHU-tShI-f5zmW8EMYC9kcAxU';
    const vapidPriv = 'dB9LHo1BQwD-kaRgCgdM4Y-YeHX_ggdycjkpGHKDy-w';

    webpush.setVapidDetails('mailto:support@takeme.sk', vapidPub, vapidPriv);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify shared internal secret via secure RPC (only service_role can execute it).
    const { data: secretValue, error: secretErr } = await supabase.rpc('get_internal_push_secret' as never);
    if (secretErr) {
      console.error('[InternalPush] Failed to load secret:', secretErr);
    }
    const expectedSecret = (secretValue as string | null) ?? undefined;
    const providedSecret = req.headers.get('x-internal-secret');

    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.warn('[InternalPush] Invalid or missing internal secret', { hasExpected: !!expectedSecret, hasProvided: !!providedSecret });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { profile_id, title, body, data, tag } = await req.json() as PushPayload;
    if (!profile_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('profile_id', profile_id);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[InternalPush] No subscriptions for ${profile_id}`);
      return new Response(JSON.stringify({ success: false, message: 'no subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data || {},
      tag: tag || 'takeme-notification',
    });

    let sent = 0;
    for (const sub of subscriptions) {
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
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          console.log(`[InternalPush] removed expired subscription ${sub.id}`);
        } else {
          console.error('[InternalPush] error sending:', statusCode, e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent, total: subscriptions.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[InternalPush] fatal:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
