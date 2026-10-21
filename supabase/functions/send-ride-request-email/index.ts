// Internal-only edge function called by the notify_new_ride_request DB trigger via pg_net.
// Sends the driver an email when a passenger creates a new ride request.
// Authorization: requires X-Internal-Secret header matching internal_push_secret app config.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
};

const SITE_URL = 'https://www.takeme.sk';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify shared internal secret via secure RPC (only service_role can execute it).
    const { data: secretValue, error: secretErr } = await supabase.rpc('get_internal_push_secret' as never);
    if (secretErr) {
      console.error('[RideRequestEmail] Failed to load secret:', secretErr);
    }
    const expectedSecret = (secretValue as string | null) ?? undefined;
    const providedSecret = req.headers.get('x-internal-secret');

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { request_id } = await req.json() as { request_id?: string };
    if (!request_id) {
      return new Response(JSON.stringify({ error: 'Missing request_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load the request with ride and passenger details (trusted DB data, not client input).
    const { data: request, error: reqErr } = await supabase
      .from('ride_requests')
      .select('id, ride_id, passenger_id, pickup_address, rides!inner(driver_id, origin_address, destination_address, departure_time, price_per_seat)')
      .eq('id', request_id)
      .single();

    if (reqErr || !request) {
      console.error('[RideRequestEmail] Request not found:', reqErr);
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ride = (request as any).rides;
    const driverId = ride?.driver_id;

    const [{ data: driverProfile }, { data: passengerProfile }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').eq('id', driverId).single(),
      supabase.from('profiles').select('full_name').eq('id', request.passenger_id).single(),
    ]);

    if (!driverProfile?.user_id) {
      return new Response(JSON.stringify({ error: 'Driver not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: driverUser, error: userErr } = await supabase.auth.admin.getUserById(driverProfile.user_id);
    const driverEmail = driverUser?.user?.email;
    if (userErr || !driverEmail) {
      console.error('[RideRequestEmail] Driver email not found:', userErr);
      return new Response(JSON.stringify({ error: 'Driver email not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const departure = ride?.departure_time
      ? new Date(ride.departure_time).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' })
      : undefined;

    const result = await sendTemplateEmail('new-ride-request', driverEmail, {
      templateData: {
        driverName: driverProfile.full_name,
        passengerName: passengerProfile?.full_name || 'Cestujúci',
        originAddress: ride?.origin_address,
        destinationAddress: ride?.destination_address,
        pickupAddress: request.pickup_address,
        departureTime: departure,
        pricePerSeat: ride?.price_per_seat != null ? `${Number(ride.price_per_seat).toFixed(2)} €` : undefined,
        manageUrl: `${SITE_URL}/manage-passengers/${request.ride_id}`,
      },
      idempotencyKey: `new-ride-request-${request.id}`,
    });

    console.log('[RideRequestEmail] result:', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[RideRequestEmail] fatal:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
