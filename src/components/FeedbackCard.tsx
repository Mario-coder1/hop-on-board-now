import { useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function FeedbackCard() {
  const { profile } = useAuth();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const message = msg.trim();
    if (!profile || message.length < 3) return;
    setSending(true);
    const { error } = await (supabase as any).from("feedback").insert({ profile_id: profile.id, message });
    setSending(false);
    if (error) return toast.error("Nepodarilo sa odoslať", { description: error.message });
    setMsg("");
    toast.success("Ďakujeme za tvoj názor!");
  };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border mt-6">
      <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
        <MessageSquareHeart className="w-5 h-5 text-primary" />
        Tvoj názor a návrhy
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Čo by sme mali vylepšiť? Napíš nám nápad, chybu alebo pochvalu.
      </p>
      <Textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value.slice(0, 2000))}
        placeholder="Napr. chcel by som…"
        rows={4}
      />
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-muted-foreground">{msg.length}/2000</span>
        <Button onClick={send} disabled={sending || msg.trim().length < 3}>
          {sending ? "Odosielam…" : "Odoslať"}
        </Button>
      </div>
    </div>
  );
}
