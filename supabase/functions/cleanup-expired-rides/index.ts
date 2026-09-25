import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { type StripeEnv, createStripeClient } from '../_shared/stripe.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Auth: require x-internal-secret matching stored internal secret (used by pg_cron)
    const providedSecret = req.headers.get('x-internal-secret')
    const { data: expected, error: secretErr } = await supabase.rpc('get_internal_push_secret')
    if (secretErr || !expected || !providedSecret || providedSecret !== expected) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // VOP čl. 2.3 — žiadna automatická refundácia. Refundácia len po nahlásení
    // spolujazdca ("Vodič ma nevyzdvihol") a schválení adminom.
    const autoRefunded = 0

    // Jazdy s otvoreným nahlásením nemažeme, kým ho admin nevyrieši.
    const { data: openReports } = await supabase
      .from('reports')
      .select('ride_id')
      .eq('reason', 'driver_no_show')
      .eq('status', 'pending')
      .not('ride_id', 'is', null)
    const keepIds = Array.from(new Set((openReports ?? []).map((r: any) => r.ride_id)))

    // 48 h, aby mal spolujazdec 24 h na nahlásenie + rezerva.
    // Mažeme po dávkach (1000 ks), aby pri veľkom objeme jázd mazanie nezaseklo databázu.
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const BATCH = 1000
    let deletedCount = 0

    for (let round = 0; round < 50; round++) {
      let idQuery = supabase
        .from('rides')
        .select('id')
        .lt('departure_time', cutoff.toISOString())
        .limit(BATCH)
      if (keepIds.length) idQuery = idQuery.not('id', 'in', `(${keepIds.join(',')})`)
      const { data: batch, error: selErr } = await idQuery

      if (selErr) {
        console.error('Error selecting expired rides:', selErr)
        return new Response(
          JSON.stringify({ error: selErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!batch || batch.length === 0) break

      const ids = batch.map((r: any) => r.id)
      const { error: delErr } = await supabase.from('rides').delete().in('id', ids)
      if (delErr) {
        console.error('Error deleting expired rides:', delErr)
        return new Response(
          JSON.stringify({ error: delErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      deletedCount += ids.length
      if (batch.length < BATCH) break
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedRides?.length || 0,
        auto_refunded: autoRefunded,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
