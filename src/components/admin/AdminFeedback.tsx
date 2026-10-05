import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = { id: string; message: string; status: string; created_at: string; profile_id: string; profiles?: { full_name: string } | null };

export default function AdminFeedback() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("feedback")
      .select("id, message, status, created_at, profile_id, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await (supabase as any).from("feedback").update({ status }).eq("id", id);
    load();
  };
  const remove = async (id: string) => {
    await (supabase as any).from("feedback").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Načítavam…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Zatiaľ žiadne názory.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Spolu {rows.length} · nových {rows.filter((r) => r.status === "new").length}
      </p>
      {rows.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold text-sm">{r.profiles?.full_name ?? "Používateľ"}</div>
              <div className="flex items-center gap-2">
                <Badge variant={r.status === "new" ? "default" : "secondary"}>
                  {r.status === "new" ? "Nový" : "Prečítané"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("sk-SK")}
                </span>
              </div>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.message}</p>
            <div className="flex gap-2">
              {r.status === "new" ? (
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "read")}>Označiť prečítané</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "new")}>Označiť ako nové</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Zmazať</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
