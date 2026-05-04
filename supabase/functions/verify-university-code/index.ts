// Verify university email code and grant membership
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  university_id: string;
  email: string;
  code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('user_id', userData.user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const body = (await req.json()) as Body;
    const code = (body.code || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const universityId = body.university_id;

    if (!code || !email || !universityId) return json({ error: 'Chýbajú údaje' }, 400);
    if (!/^\d{6}$/.test(code)) return json({ error: 'Kód musí mať 6 číslic' }, 400);

    // Find latest active code
    const { data: verification, error: vErr } = await admin
      .from('university_email_verifications')
      .select('id, code_hash, attempts, expires_at, consumed_at')
      .eq('profile_id', profile.id)
      .eq('university_id', universityId)
      .eq('email', email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vErr || !verification) return json({ error: 'Najprv si vyžiadaj kód.' }, 400);

    if (new Date(verification.expires_at) < new Date()) {
      return json({ error: 'Kód vypršal. Vyžiadaj nový.' }, 400);
    }

    if (verification.attempts >= 5) {
      await admin
        .from('university_email_verifications')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', verification.id);
      return json({ error: 'Príliš veľa nesprávnych pokusov. Vyžiadaj nový kód.' }, 400);
    }

    const inputHash = await sha256(code + ':' + email);
    if (inputHash !== verification.code_hash) {
      await admin
        .from('university_email_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);
      return json({ error: 'Nesprávny kód.' }, 400);
    }

    // Mark consumed and create membership
    await admin
      .from('university_email_verifications')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', verification.id);

    const { error: memErr } = await admin.from('university_memberships').insert({
      profile_id: profile.id,
      university_id: universityId,
      verified_email: email,
    });

    if (memErr && !memErr.message.includes('duplicate')) {
      console.error('membership err', memErr);
      return json({ error: 'Nepodarilo sa overiť členstvo' }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error('Error', e);
    return json({ error: 'Server error' }, 500);
  }
});

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
