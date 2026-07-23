// Voice → structured ride fields for CreateRide.
// Accepts multipart/form-data with `file` (audio) and optional `now` (ISO).
// Returns { transcript, parsed: { destination_text, seats?, price?, departure_iso? } }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const form = await req.formData();
    const file = form.get("file");
    const now = (form.get("now") as string) || new Date().toISOString();
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Transcribe
    const sttForm = new FormData();
    sttForm.append("model", "openai/gpt-4o-mini-transcribe");
    sttForm.append("language", "sk");
    sttForm.append("prompt", "Prepis slovenskej reči o jazde. Zachovaj čísla ako číslice (napr. Čierne 1333, 3 miesta, 5 eur, 15:00).");
    sttForm.append("file", file, file.name || "recording.webm");
    const sttRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: sttForm,
    });
    if (!sttRes.ok) {
      const t = await sttRes.text();
      return new Response(JSON.stringify({ error: `STT failed: ${t}` }), {
        status: sttRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sttJson = await sttRes.json();
    const transcript: string = sttJson.text ?? "";

    // 2) Parse to structured JSON
    const system = `Si extraktor údajov o jazde. Používateľ hovorí slovensky/česky.
Aktuálny čas: ${now} (ISO, Europe/Bratislava). Z prepisu extrahuj JSON.

Polia:
- destination_text: PRESNÁ cieľová adresa vrátane čísla domu ak bolo povedané (napr. "Čierne 1333", "Košice, Hlavná 12", "Žilina"). Slovné čísla preveď na číslice ("tisíc tristo tridsať tri" → "1333", "dvanásť" → "12"). NIKDY nevynechaj číslo domu ak zaznelo. Povinné ak spomenuté.
- origin_text: ak používateľ výslovne uvedie odkiaľ (rovnaké pravidlá pre čísla). Inak null.
- seats: počet voľných miest (integer 1-8) alebo null.
- price: cena za miesto v EUR (number) alebo null.
- departure_iso: ISO 8601 čas odchodu. Rozumej výrazom ako "za hodinu", "o 15:00", "zajtra ráno o 7", "o 30 minút", "dnes večer o 20". Ak nie je spomenuté, null.

Vráť LEN JSON, žiadny komentár.`;

    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: transcript },
        ],
      }),
    });
    if (!chatRes.ok) {
      const t = await chatRes.text();
      return new Response(JSON.stringify({ error: `Parse failed: ${t}`, transcript }), {
        status: chatRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const chatJson = await chatRes.json();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(chatJson.choices?.[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
    }

    return new Response(JSON.stringify({ transcript, parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
