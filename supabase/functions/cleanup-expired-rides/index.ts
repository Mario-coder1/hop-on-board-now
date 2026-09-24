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

    // VOP čl. 2.3 — automatická 100 % refundácia rezervačného poplatku, ak vodič
    // pasažiera nevyzdvihol (jazda odišla pred 2 h a stav je stále pending/accepted).
    let autoRefunded = 0
    try {
      const noShowCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const { data: noShows } = await supabase
        .from('ride_requests')
        .select('id, stripe_payment_intent_id, stripe_session_id, ride:rides!inner(departure_time)')
        .eq('payment_status', 'paid')
        .in('status', ['pending', 'accepted'])
        .is('refunded_at', null)
        .not('stripe_payment_intent_id', 'is', null)
        .lt('ride.departure_time', noShowCutoff)
        .limit(100)
      for (const rr of noShows ?? []) {
        try {
          const env: StripeEnv = String(rr.stripe_session_id ?? '').startsWith('cs_live_') ? 'live' : 'sandbox'
          const stripe = createStripeClient(env)
          const refund = await stripe.refunds.create({
            payment_intent: rr.stripe_payment_intent_id!,
            metadata: { request_id: rr.id, cancelled_by: 'system', reason: 'driver_no_show' },
          })
          await supabase.from('ride_requests').update({
            status: 'cancelled',
            payment_status: 'refunded',
            stripe_refund_id: refund.id,
            refunded_at: new Date().toISOString(),
            cancellation_reason: 'Automatická refundácia — vodič vás nevyzdvihol (VOP čl. 2.3)',
          }).eq('id', rr.id)
          autoRefunded++
        } catch (e) {
          console.error('auto refund failed', rr.id, e)
        }
      }
    } catch (e) {
      console.error('no-show scan failed', e)
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const { data: deletedRides, error } = await supabase
      .from('rides')
      .delete()
      .lt('departure_time', cutoff.toISOString())
      .select('id')

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
