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

// --- Web Push Crypto Implementation ---

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

async function importVapidKeys(publicKeyBase64: string, privateKeyBase64: string) {
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);

  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    []
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
    try {
      privateKey = await crypto.subtle.importKey('pkcs8', privateKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
    } catch {
      const maybeRawPrivateKey = privateKeyBytes.length > 32
        ? privateKeyBytes.slice(privateKeyBytes.length - 32)
        : privateKeyBytes;
      const pkcs8Header = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07,
        0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01, 0x06, 0x08,
        0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, 0x04,
        0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
      ]);
      const pkcs8 = concat(pkcs8Header, maybeRawPrivateKey);
      privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
    }
  }

  return { publicKey, privateKey, publicKeyBytes };
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: CryptoKey,
  vapidPrivateKey: CryptoKey,
  vapidPublicKeyBytes: Uint8Array,
  subject: string
) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    vapidPrivateKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32);
  } else {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    const rBytes = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigBytes.slice(sStart, sStart + sLen);
    
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    
    // Pad if needed
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${unsignedToken}.${base64UrlEncode(rawSig.buffer)}`;
  const pubKeyB64 = base64UrlEncode(vapidPublicKeyBytes.buffer);

  return `vapid t=${jwt}, k=${pubKeyB64}`;
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

async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt.length ? salt : new Uint8Array(32)));
  
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = concat(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
  
  return okm.slice(0, length);
}

async function encryptPayload(
  payload: string,
  subscriptionPublicKey: string,
  subscriptionAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKeyBytes: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  const serverPublicKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );
  
  // Import subscription public key
  const clientPublicKeyBytes = base64UrlDecode(subscriptionPublicKey);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeys.privateKey,
      256
    )
  );
  
  const authBytes = base64UrlDecode(subscriptionAuth);
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // RFC 8291 key derivation
  const keyInfoPrefix = encoder.encode('WebPush: info\0');
  const keyInfo = concat(keyInfoPrefix, clientPublicKeyBytes, serverPublicKeyBytes);
  
  const ikm = await hkdfDerive(sharedSecret, authBytes, keyInfo, 32);
  
  const contentEncKeyInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const contentEncKey = await hkdfDerive(ikm, salt, contentEncKeyInfo, 16);
  
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  const nonce = await hkdfDerive(ikm, salt, nonceInfo, 12);
  
  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Add padding delimiter
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPayload
    )
  );
  
  return { ciphertext: encrypted, salt, serverPublicKeyBytes };
}

function buildPushBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  serverPublicKey: Uint8Array
): Uint8Array {
  // aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  
  const idLen = new Uint8Array([65]);
  
  return concat(salt, rs, idLen, serverPublicKey, ciphertext);
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKeyBase64: string,
  vapidPrivateKeyBase64: string
): Promise<Response> {
  const { publicKey, privateKey, publicKeyBytes } = await importVapidKeys(
    vapidPublicKeyBase64,
    vapidPrivateKeyBase64
  );

  const authorization = await createVapidAuthHeader(
    endpoint,
    publicKey,
    privateKey,
    publicKeyBytes,
    'mailto:noreply@takeme.app'
  );

  const { ciphertext, salt, serverPublicKeyBytes } = await encryptPayload(payload, p256dh, auth);
  const body = buildPushBody(ciphertext, salt, serverPublicKeyBytes);

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
