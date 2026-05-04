// Send 6-digit university email verification code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  university_id: string;
  email: string;
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
      .select('id, full_name')
      .eq('user_id', userData.user.id)
      .single();
    if (!profile) return json({ error: 'Profile not found' }, 404);

    const body = (await req.json()) as Body;
    const email = (body.email || '').trim().toLowerCase();
    const universityId = body.university_id;

    if (!email || !universityId) return json({ error: 'Chýbajú údaje' }, 400);
    if (email.length > 255) return json({ error: 'Email príliš dlhý' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Neplatný email' }, 400);

    // Get university
    const { data: uni, error: uniErr } = await admin
      .from('universities')
      .select('id, name, short_name, email_domain')
      .eq('id', universityId)
      .eq('active', true)
      .single();
    if (uniErr || !uni) return json({ error: 'Univerzita nenájdená' }, 404);

    // Validate email domain matches
    const domain = email.split('@')[1];
    if (domain !== uni.email_domain) {
      return json({ error: `Email musí končiť na @${uni.email_domain}` }, 400);
    }

    // Already a member?
    const { data: existing } = await admin
      .from('university_memberships')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('university_id', universityId)
      .maybeSingle();
    if (existing) return json({ error: 'Už si overený členom tejto univerzity' }, 400);

    // Rate limit: max 3 active codes per profile per university in last 10 min
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('university_email_verifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .eq('university_id', universityId)
      .gte('created_at', tenMinAgo);
    if ((count ?? 0) >= 3) {
      return json({ error: 'Príliš veľa pokusov. Skús to o chvíľu znova.' }, 429);
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await sha256(code + ':' + email);

    // Invalidate previous unconsumed codes
    await admin
      .from('university_email_verifications')
      .update({ consumed_at: new Date().toISOString() })
      .eq('profile_id', profile.id)
      .eq('university_id', universityId)
      .is('consumed_at', null);

    // Store code (10 min expiry)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insErr } = await admin
      .from('university_email_verifications')
      .insert({
        profile_id: profile.id,
        university_id: universityId,
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
      });
    if (insErr) {
      console.error('insert err', insErr);
      return json({ error: 'Nepodarilo sa vygenerovať kód' }, 500);
    }

    // Check if caller is admin (for testing - admins can see code in response)
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    const isAdmin = !!roleData;

    // Try to send email via Supabase Auth (native email system - same as password reset)
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const subject = `Overenie ${uni.short_name} – kód ${code}`;
      const html = buildEmailHtml(code, uni.short_name, uni.name);

      // Use Supabase admin generateLink - sends via configured email system
      // We use 'magiclink' as transport but the user will only use OUR code
      const { error: linkErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: {
          university_verification: true,
          code,
          university: uni.short_name,
          subject,
          html_message: html,
        },
      });
      if (linkErr) {
        emailError = linkErr.message;
        console.error('[university-code] Supabase invite error:', linkErr);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = String(e);
      console.error('[university-code] email exception', e);
    }

    // Always log code for admin/dev visibility
    console.log(`[university-code] Code for ${email} (${uni.short_name}): ${code}`);

    return json({
      success: true,
      email_sent: emailSent,
      email_error: emailError,
      // Return code only to admins for testing
      ...(isAdmin ? { dev_code: code } : {}),
    });
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

function buildEmailHtml(code: string, shortName: string, fullName: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f6f7f9;margin:0;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.06)">
      <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px">Overenie ${shortName}</h1>
      <p style="color:#475569;font-size:14px;line-height:1.5">Pre pripojenie do komunity <strong>${fullName}</strong> v aplikácii TakeMe zadaj tento kód:</p>
      <div style="text-align:center;margin:24px 0">
        <div style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:8px;background:#f1f5f9;color:#0f172a;padding:18px 28px;border-radius:12px">${code}</div>
      </div>
      <p style="color:#94a3b8;font-size:12px">Kód platí 10 minút. Ak si o overenie nežiadal, ignoruj tento email.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">TakeMe – zdieľanie jázd</p>
    </div></body></html>`;
}
