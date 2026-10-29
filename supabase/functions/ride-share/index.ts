import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE_URL = 'https://www.takeme.sk'
const SHARE_IMAGE = `${SITE_URL}/og-image.png`
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const htmlResponse = (html: string, status = 200) => new Response(html, {
  status,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'User-Agent',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  },
})

const renderPage = ({
  title,
  description,
  shareUrl,
  rideUrl,
}: {
  title: string
  description: string
  shareUrl: string
  rideUrl: string
}) => htmlResponse(`<!doctype html>
<html lang="sk">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="noindex,follow">
    <link rel="canonical" href="${escapeHtml(rideUrl)}">
    <meta property="og:site_name" content="TakeMe">
    <meta property="og:locale" content="sk_SK">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${SHARE_IMAGE}">
    <meta property="og:image:secure_url" content="${SHARE_IMAGE}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="640">
    <meta property="og:image:alt" content="TakeMe — slovenská spolujazda">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${SHARE_IMAGE}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(rideUrl)}">
  </head>
  <body>
    <p><a href="${escapeHtml(rideUrl)}">Otvoriť jazdu v TakeMe</a></p>
    <script>window.location.replace(${JSON.stringify(rideUrl)})</script>
  </body>
</html>`)

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
  }

  const requestUrl = new URL(req.url)
  const rideId = requestUrl.searchParams.get('id') ?? ''
  if (!UUID_PATTERN.test(rideId)) return new Response('Invalid ride', { status: 400 })

  const backendUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!backendUrl || !serviceKey) return new Response('Unavailable', { status: 503 })

  const admin = createClient(backendUrl, serviceKey)

  // JSON režim pre verejnú stránku /j/:id (anonymní návštevníci nemajú RLS prístup k rides)
  if (requestUrl.searchParams.get('format') === 'json') {
    const { data: ride } = await admin
      .from('rides')
      .select('id,origin_address,destination_address,departure_time,available_seats,price_per_seat,status,driver:public_profiles!rides_driver_id_fkey(full_name,rating,avatar_url,total_rides)')
      .eq('id', rideId)
      .is('university_id', null)
      .maybeSingle()
    return new Response(JSON.stringify({ ride: ride ?? null }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  const ua = req.headers.get('user-agent') ?? ''
  const isCrawler = /facebookexternalhit|facebot|meta-externalagent|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|viber|skypeuripreview|pinterest|redditbot|googlebot|bingbot|embedly|applebot/i.test(ua)
  if (!isCrawler) {
    return new Response(null, { status: 302, headers: { Location: `${SITE_URL}/j/${rideId}`, 'Cache-Control': 'no-store' } })
  }

  const { data: ride } = await admin
    .from('rides')
    .select('origin_address,destination_address,departure_time,available_seats,price_per_seat')
    .eq('id', rideId)
    .is('university_id', null)
    .maybeSingle()

  const rideUrl = `${SITE_URL}/j/${rideId}`
  const shareUrl = `${backendUrl}/functions/v1/ride-share?id=${encodeURIComponent(rideId)}`

  if (!ride) {
    return renderPage({
      title: 'Spolujazda cez TakeMe',
      description: 'Pozri si zdieľanú jazdu v aplikácii TakeMe.',
      shareUrl,
      rideUrl,
    })
  }

  const departure = new Date(String(ride.departure_time).replace(' ', 'T'))
  const when = Number.isNaN(departure.getTime())
    ? ''
    : new Intl.DateTimeFormat('sk-SK', {
        timeZone: 'Europe/Bratislava',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(departure)

  const title = `${ride.origin_address} → ${ride.destination_address} | TakeMe`
  const details = [
    when ? `Odchod ${when}` : null,
    ride.price_per_seat != null ? `${Number(ride.price_per_seat).toFixed(2)} € za miesto` : null,
    ride.available_seats != null ? `${ride.available_seats} voľné miesta` : null,
  ].filter(Boolean)

  return renderPage({
    title,
    description: `Ponuka spolujazdy ${ride.origin_address} → ${ride.destination_address}. ${details.join(' · ')}`,
    shareUrl,
    rideUrl,
  })
})