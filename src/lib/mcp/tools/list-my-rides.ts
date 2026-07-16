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
  name: "list_my_rides",
  title: "Zoznam mojich jázd (vodič)",
  description:
    "Vráti jazdy, ktoré signed-in používateľ vytvoril ako vodič (aktívne, prebiehajúce, dokončené). Zoradené od najnovších.",
  inputSchema: {
    status: z
      .enum(["active", "in_progress", "completed", "cancelled", "all"])
      .optional()
      .describe("Filter podľa stavu jazdy. Predvolené: all."),
    limit: z.number().int().min(1).max(50).optional().describe("Max počet záznamov. Predvolené: 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Nie ste prihlásený." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (!profile) {
      return { content: [{ type: "text", text: "Profil sa nenašiel." }], isError: true };
    }
    let q = sb
      .from("rides")
      .select("id, origin_address, destination_address, departure_time, price_per_seat, seats_available, status")
      .eq("driver_id", profile.id)
      .order("departure_time", { ascending: false })
      .limit(limit ?? 20);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { rides: data ?? [] },
    };
  },
});
