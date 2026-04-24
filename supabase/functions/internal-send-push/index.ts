// Internal-only edge function called by DB triggers via pg_net.
// Authorization: requires X-Internal-Secret header matching INTERNAL_PUSH_SECRET env.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// --- Web Push Crypto Implementation (same as send-push-notification) ---

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function importVapidKeys(publicKeyBase64: string, privateKeyBase64: string) {
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);

  const publicKey = await crypto.subtle.importKey(
    'raw', publicKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, true, []
  );

  let privateKey: CryptoKey;
  if (privateKeyBytes.length === 32) {
    const pkcs8Header = new Uint8Array([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07,
      0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01, 0x06, 0x08,
      0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, 0x04,
      0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    const pkcs8 = concat(pkcs8Header, privateKeyBytes);
    privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  } else {
    privateKey = await crypto.subtle.importKey('pkcs8', privateKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  }
  return { publicKey, privateKey, publicKeyBytes };
}

async function createVapidAuthHeader(endpoint: string, _pub: CryptoKey, priv: CryptoKey, pubBytes: Uint8Array, subject: string) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };
  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, priv, enc.encode(unsigned));
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32); s = sigBytes.slice(32);
  } else {
    const rLen = sigBytes[3];
    const rBytes = sigBytes.slice(4, 4 + rLen);
    const sLen = sigBytes[4 + rLen + 1];
    const sBytes = sigBytes.slice(4 + rLen + 2, 4 + rLen + 2 + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p; }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p; }
  }
  const rawSig = new Uint8Array(64); rawSig.set(r, 0); rawSig.set(s, 32);
  const jwt = `${unsigned}.${base64UrlEncode(rawSig.buffer)}`;
  const pubKeyB64 = base64UrlEncode(pubBytes.buffer);
  return `vapid t=${jwt}, k=${pubKeyB64}`;
}

async function hkdfDerive(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt.length ? salt : new Uint8Array(32)));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, concat(info, new Uint8Array([1]))));
  return okm.slice(0, length);
}

async function encryptPayload(payload: string, subPub: string, subAuth: string) {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payload);
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPubBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));
  const clientPubBytes = base64UrlDecode(subPub);
  const clientPub = await crypto.subtle.importKey('raw', clientPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPub }, serverKeys.privateKey, 256));
  const authBytes = base64UrlDecode(subAuth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyInfo = concat(enc.encode('WebPush: info\0'), clientPubBytes, serverPubBytes);
  const ikm = await hkdfDerive(sharedSecret, authBytes, keyInfo, 32);
  const cek = await hkdfDerive(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfDerive(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const padded = concat(payloadBytes, new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));
  return { ciphertext, salt, serverPubBytes };
}

function buildPushBody(ciphertext: Uint8Array, salt: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([65]), serverPub, ciphertext);
}

async function sendWebPush(endpoint: string, p256dh: string, auth: string, payload: string, vapidPub: string, vapidPriv: string) {
  const { publicKey, privateKey, publicKeyBytes } = await importVapidKeys(vapidPub, vapidPriv);
  const authorization = await createVapidAuthHeader(endpoint, publicKey, privateKey, publicKeyBytes, 'mailto:noreply@takeme.app');
  const { ciphertext, salt, serverPubBytes } = await encryptPayload(payload, p256dh, auth);
  const body = buildPushBody(ciphertext, salt, serverPubBytes);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high',
    },
    body,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPub = Deno.env.get('VAPID_PUBLIC_KEY') || 'BNlR7VxH3G8jE4o8z2bF3pK5cQ9wY1nM6vS0hX4tA7iU2dL8rO9sP5jN3kW1yZ6mE8xC0bV4gF2aH7qJ5uT9oI3';
    const vapidPriv = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPriv) {
      return new Response(JSON.stringify({ error: 'Push not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        const response = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth, payload, vapidPub, vapidPriv);
        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 410 || response.status === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`[InternalPush] Failed ${response.status}: ${await response.text()}`);
        }
      } catch (e) {
        console.error('[InternalPush] error sending:', e);
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
