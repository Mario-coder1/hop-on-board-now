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

    // ---- Variant C: „Ide jazda?“ pre nespustené jazdy s cestujúcimi ----
    const confirmStats = { asked: 0, reminded: 0, cancelled: 0 }
    try {
      const nowMs = Date.now()
      const notify = async (profileId: string, title: string, message: string, rideId: string) => {
        await supabase.from('notifications').insert({ profile_id: profileId, title, message })
        try {
          await fetch(`${supabaseUrl}/functions/v1/internal-send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-secret': String(expected) },
            body: JSON.stringify({ profile_id: profileId, title, body: message, data: { url: '/my-rides', ride_id: rideId }, tag: `ride-confirm-${rideId}` }),
          })
        } catch (_) { /* ignore */ }
      }
      const { data: due } = await supabase
        .from('rides')
        .select('id, driver_id, origin_address, destination_address, departure_time, confirm_asked_at, confirm_reminded_at')
        .eq('status', 'active')
        .is('driver_confirmed_at', null)
        .lte('departure_time', new Date(nowMs + 15 * 60 * 1000).toISOString())
        .gte('departure_time', new Date(nowMs - 24 * 3600 * 1000).toISOString())
        .limit(500)
      for (const ride of due ?? []) {
        const { data: reqs } = await supabase
          .from('ride_requests')
          .select('id, passenger_id, status, payment_status, payment_captured_at, pin_verified_at, stripe_payment_intent_id')
          .eq('ride_id', ride.id)
          .in('status', ['pending', 'accepted', 'driver_arrived', 'picked_up'])
        const list = reqs ?? []
        if (!list.length) continue // bez cestujúcich — len sa schová (filter 15 min)
        if (list.some((r: any) => r.pin_verified_at || r.status === 'picked_up')) continue // nástupný kód = nikdy nerušiť
        const route = `${ride.origin_address?.split(',')[0]} → ${ride.destination_address?.split(',')[0]}`
        const depMs = new Date(String(ride.departure_time).replace(' ', 'T')).getTime()
        if (!ride.confirm_asked_at) {
          await notify(ride.driver_id, 'Ide tvoja jazda?', `${route}: o chvíľu odchod. Klikni a potvrď, že jazda ide.`, ride.id)
          await supabase.from('rides').update({ confirm_asked_at: new Date().toISOString() }).eq('id', ride.id)
          confirmStats.asked++
        } else if (!ride.confirm_reminded_at && nowMs >= depMs + 15 * 60 * 1000) {
          await notify(ride.driver_id, 'Posledná výzva: ide jazda?', `${route}: klikni a potvrď. Ak do 30 minút nepotvrdíš, jazda sa zruší a cestujúcim sa uvoľnia peniaze.`, ride.id)
          await supabase.from('rides').update({ confirm_reminded_at: new Date().toISOString() }).eq('id', ride.id)
          confirmStats.reminded++
        } else if (ride.confirm_reminded_at && nowMs - new Date(ride.confirm_reminded_at).getTime() >= 30 * 60 * 1000) {
          const reason = 'Vodič nepotvrdil, že jazda ide'
          await supabase.from('rides').update({ status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() }).eq('id', ride.id)
          for (const r of list as any[]) {
            if (r.payment_status === 'paid' && r.stripe_payment_intent_id) {
              for (const env of ['live', 'sandbox'] as StripeEnv[]) {
                try {
                  const stripe = createStripeClient(env)
                  if (r.payment_captured_at) await stripe.refunds.create({ payment_intent: r.stripe_payment_intent_id })
                  else await stripe.paymentIntents.cancel(r.stripe_payment_intent_id)
                  await supabase.from('ride_requests').update({ payment_status: 'refunded' }).eq('id', r.id)
                  break
                } catch (e) { console.error('release failed', env, r.id, (e as Error).message) }
              }
            }
            await supabase.from('ride_requests').update({ status: 'cancelled', cancellation_reason: reason }).eq('id', r.id)
            await notify(r.passenger_id, 'Jazda zrušená', `${route}: vodič nepotvrdil jazdu. Rezervačný poplatok ti uvoľníme/vrátime.`, ride.id)
          }
          await notify(ride.driver_id, 'Jazda zrušená', `${route}: zrušili sme ju, lebo si nepotvrdil, že ide.`, ride.id)
          confirmStats.cancelled++
        }
      }
    } catch (e) {
      console.error('confirm flow error', e)
    }

    // Jazdy s otvoreným nahlásením nemažeme, kým ho admin nevyrieši.
    const { data: openReports } = await supabase
      .from('reports')
      .select('ride_id')
      .eq('reason', 'driver_no_show')
      .eq('status', 'pending')
      .not('ride_id', 'is', null)
    const keepIds = Array.from(new Set((openReports ?? []).map((r: any) => r.ride_id)))

    // 24 h po odchode (jazdy s otvoreným nahlásením ostávajú).
    // Mažeme po dávkach (1000 ks), aby pri veľkom objeme jázd mazanie nezaseklo databázu.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
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
        deleted: deletedCount,
        auto_refunded: autoRefunded,
        confirm: confirmStats,
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
