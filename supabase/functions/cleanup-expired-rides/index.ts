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

    // 48 h, aby mal spolujazdec 24 h na nahlásenie + rezerva
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

    let delQuery = supabase
      .from('rides')
      .delete()
      .lt('departure_time', cutoff.toISOString())
    if (keepIds.length) delQuery = delQuery.not('id', 'in', `(${keepIds.join(',')})`)
    const { data: deletedRides, error } = await delQuery.select('id')

    if (error) {
      console.error('Error deleting expired rides:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
