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
  name: "list_my_trips",
  title: "Zoznam mojich ciest (spolujazdec)",
  description:
    "Vráti žiadosti o jazdu (ride_requests), kde signed-in používateľ vystupuje ako spolujazdec.",
  inputSchema: {
    status: z
      .enum(["pending", "accepted", "driver_arrived", "picked_up", "completed", "cancelled", "rejected", "all"])
      .optional()
      .describe("Filter podľa stavu žiadosti. Predvolené: all."),
    limit: z.number().int().min(1).max(50).optional(),
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
      .from("ride_requests")
      .select("id, ride_id, status, pickup_address, dropoff_address, amount_paid, payment_status, created_at")
      .eq("passenger_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status && status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { trips: data ?? [] },
    };
  },
});
