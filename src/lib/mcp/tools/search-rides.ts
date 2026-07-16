import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_rides",
  title: "Vyhľadať dostupné jazdy",
  description:
    "Vyhľadá aktívne a prebiehajúce jazdy podľa mesta pôvodu a cieľa (case-insensitive substring). Vráti až 20 jázd zoradených podľa času odchodu.",
  inputSchema: {
    origin: z.string().min(2).describe("Mesto alebo časť adresy pôvodu, napr. 'Bratislava'."),
    destination: z.string().min(2).describe("Mesto alebo časť adresy cieľa, napr. 'Košice'."),
    max_price: z.number().positive().optional().describe("Maximálna cena za miesto v EUR."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ origin, destination, max_price }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nie ste prihlásený." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("rides")
      .select("id, origin_address, destination_address, departure_time, price_per_seat, seats_available, status")
      .in("status", ["active", "in_progress"])
      .ilike("origin_address", `%${origin}%`)
      .ilike("destination_address", `%${destination}%`)
      .gt("seats_available", 0)
      .order("departure_time", { ascending: true })
      .limit(20);
    if (max_price) q = q.lte("price_per_seat", max_price);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { rides: data ?? [] },
    };
  },
});
