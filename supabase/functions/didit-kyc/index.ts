import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const DIDIT = 'https://verification.didit.me/v3'
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = req.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: claims, error } = await userClient.auth.getClaims(auth.replace('Bearer ', ''))
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', claims.claims.sub).maybeSingle()
    if (!profile) return json({ error: 'no_profile' }, 400)

    const apiKey = Deno.env.get('DIDIT_API_KEY')
    const workflowId = Deno.env.get('DIDIT_WORKFLOW_ID')
    if (!apiKey || !workflowId) return json({ error: 'not_configured' }, 500)

    const body = await req.json().catch(() => ({}))
    const action = body?.action
    if (action === 'workflow_fix') {
      const r = await fetch(`${DIDIT}/workflows/${workflowId}/`, {
        method: 'PATCH',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_desktop_allowed: true }),
      })
      const d = await r.json()
      return json({ status: r.status, workflow_status: d?.status, is_desktop_allowed: d?.is_desktop_allowed, detail: r.ok ? undefined : d })
    }
    if (action === 'workflow_debug') {
      const list = await fetch(`${DIDIT}/workflows/`, { headers: { 'x-api-key': apiKey } })
      const ld = await list.json()
      const items = Array.isArray(ld) ? ld : (ld.results || ld.workflows || [])
      const wf = items.find((w: Record<string, unknown>) => w.workflow_id === workflowId || w.uuid === workflowId)
      if (!wf) return json({ error: 'wf_not_found', list: ld }, 404)
      const det = await fetch(`${DIDIT}/workflows/${wf.uuid}/`, { headers: { 'x-api-key': apiKey } })
      return json(await det.json(), det.status)
    }
    if (action !== 'start' && action !== 'check') return json({ error: 'invalid_action' }, 400)

    if (action === 'start') {
      const origin = typeof body.return_url === 'string' && /^https?:\/\//.test(body.return_url) ? body.return_url : undefined
      const r = await fetch(`${DIDIT}/session/`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, vendor_data: profile.id, callback: origin }),
      })
      const d = await r.json()
      if (!r.ok) { console.error('didit create failed', r.status, JSON.stringify(d)); return json({ error: 'didit_error', detail: d }, 502) }
      await admin.from('driver_verifications').upsert({
        profile_id: profile.id, session_id: d.session_id, status: 'in_progress', updated_at: new Date().toISOString(),
      })
      return json({ url: d.url })
    }

    const { data: v } = await admin.from('driver_verifications').select('*').eq('profile_id', profile.id).maybeSingle()
    if (!v?.session_id) return json({ status: 'not_started' })
    if (v.verified_at) return json({ status: 'approved' })
    const r = await fetch(`${DIDIT}/session/${v.session_id}/decision/`, { headers: { 'x-api-key': apiKey } })
    const d = await r.json()
    if (!r.ok) return json({ status: v.status })
    const raw = String(d.status || '').toLowerCase()
    const status = raw === 'approved' ? 'approved' : raw === 'declined' ? 'declined' : raw.includes('review') ? 'in_review' : 'in_progress'
    await admin.from('driver_verifications').update({
      status, verified_at: status === 'approved' ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    }).eq('profile_id', profile.id)
    return json({ status })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
