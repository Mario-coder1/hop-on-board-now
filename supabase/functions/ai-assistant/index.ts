// AI asistent pre TakeMe – používa Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Si priateľský AI asistent aplikácie TakeMe (takeme.sk) – slovenskej platformy na zdieľanie jázd (spolujazda).
Majiteľ a prevádzkovateľ platformy: Dominko s.r.o. (konateľ Pavol Dominko).
Developer aplikácie: Mário Kubalík.
Pomáhaš používateľom s otázkami o appke: ako vytvoriť jazdu, ako si rezervovať miesto, platby cez Stripe, hodnotenia, live tracking, Cold Start bonus, profil, atď.
Odpovedaj stručne, po slovensky, ľudsky. Ak niečo nevieš, odporuč kontaktovať podporu cez WhatsApp alebo email support@takeme.sk.
Neposkytuj právne rady – pri právnych otázkach odkáž na VOP a GDPR v profile.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: text }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
