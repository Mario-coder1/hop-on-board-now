// Generates rides from active ride_templates for the next N days.
// Called by pg_cron daily.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_AHEAD = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { data: templates, error } = await supabase
      .from('ride_templates')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    let created = 0;
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    for (const tpl of templates ?? []) {
      const weekdays: number[] = tpl.weekdays ?? [];
      if (weekdays.length === 0) continue;

      const [hStr, mStr] = String(tpl.departure_time).split(':');
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);

      // Start from the day after last_generated_date (or today)
      const lastGen = tpl.last_generated_date ? new Date(tpl.last_generated_date + 'T00:00:00Z') : null;
      let startOffset = 0;
      if (lastGen) {
        const diffDays = Math.floor((lastGen.getTime() - today.getTime()) / 86400000);
        startOffset = Math.max(0, diffDays + 1);
      }

      let lastGenerated: string | null = tpl.last_generated_date ?? null;

      for (let i = startOffset; i < DAYS_AHEAD; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const dow = d.getUTCDay(); // 0=Sun..6=Sat
        if (!weekdays.includes(dow)) continue;

        // Build local Bratislava departure (CET/CEST). Approximation: use Date.UTC and let Postgres store as UTC.
        // We construct departure as if the time is local SK time. Use Europe/Bratislava offset.
        const departure = buildBratislavaDate(d, hour, minute);
        // Skip past times
        if (departure.getTime() <= now.getTime()) continue;

        // Avoid duplicates: skip if a ride for this template+date already exists
        const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
        const dayEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59)).toISOString();
        const { data: existing } = await supabase
          .from('rides')
          .select('id')
          .eq('template_id', tpl.id)
          .gte('departure_time', dayStart)
          .lte('departure_time', dayEnd)
          .maybeSingle();
        if (existing) continue;

        const { error: insErr } = await supabase.from('rides').insert({
          driver_id: tpl.driver_id,
          origin_address: tpl.origin_address,
          origin_lat: tpl.origin_lat,
          origin_lng: tpl.origin_lng,
          destination_address: tpl.destination_address,
          destination_lat: tpl.destination_lat,
          destination_lng: tpl.destination_lng,
          departure_time: departure.toISOString(),
          available_seats: tpl.available_seats,
          price_per_seat: tpl.price_per_seat,
          status: 'active',
          template_id: tpl.id,
        });
        if (insErr) {
          console.error('[generate] insert error', insErr);
          continue;
        }
        created++;
        lastGenerated = d.toISOString().slice(0, 10);
      }

      if (lastGenerated && lastGenerated !== tpl.last_generated_date) {
        await supabase
          .from('ride_templates')
          .update({ last_generated_date: lastGenerated })
          .eq('id', tpl.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, created, templates: templates?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-recurring-rides] error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Bratislava (CET/CEST) approximate offset based on European DST rules.
// CEST (UTC+2): last Sunday of March -> last Sunday of October. Otherwise CET (UTC+1).
function buildBratislavaDate(dayUTC: Date, hour: number, minute: number): Date {
  const y = dayUTC.getUTCFullYear();
  const m = dayUTC.getUTCMonth();
  const d = dayUTC.getUTCDate();
  const offsetHours = isCEST(y, m, d) ? 2 : 1;
  return new Date(Date.UTC(y, m, d, hour - offsetHours, minute, 0));
}

function isCEST(y: number, m: number, d: number): boolean {
  // m: 0=Jan
  if (m < 2 || m > 9) return false;
  if (m > 2 && m < 9) return true;
  // March or October — find last Sunday
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let lastSunday = lastDay;
  while (new Date(Date.UTC(y, m, lastSunday)).getUTCDay() !== 0) lastSunday--;
  if (m === 2) return d >= lastSunday; // March: CEST starts last Sunday
  return d < lastSunday; // October: CEST ends last Sunday
}
