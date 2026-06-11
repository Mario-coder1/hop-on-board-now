import { useEffect, useState } from "react";
import { Gift, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Status = {
  slots_remaining: number;
  program_open: boolean;
  activated?: boolean;
  qualified_at?: string | null;
  commission_exempt_until?: string | null;
  completed_rides?: number;
  required_rides?: number;
};

export const ColdStartCard = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("cold_start_status");
    if (!error && data) setStatus(data as unknown as Status);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activate = async () => {
    setActivating(true);
    const { error } = await supabase.rpc("activate_cold_start");
    setActivating(false);
    if (error) {
      toast.error("Nepodarilo sa aktivovať", { description: error.message });
      return;
    }
    toast.success("🎁 Cold Start aktivovaný! Dokonči 5 jázd s pasažiermi.");
    load();
  };

  if (loading || !status) return null;

  // Hide if program closed AND user hasn't qualified
  if (!status.program_open && !status.qualified_at) return null;

  // Qualified — show success badge while exemption active
  if (status.qualified_at) {
    const until = status.commission_exempt_until ? new Date(status.commission_exempt_until) : null;
    const active = until && until > new Date();
    if (!active) return null;
    return (
      <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-green-500/10 border border-emerald-500/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="font-display font-semibold">Cold Start aktívny 🎁</div>
            <div className="text-xs text-muted-foreground">
              0 % komisia do {until!.toLocaleDateString("sk-SK")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completed = status.completed_rides ?? 0;
  const required = status.required_rides ?? 5;
  const pct = Math.min(100, (completed / required) * 100);

  return (
    <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-teal-500/10 border border-emerald-500/30">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="font-display font-semibold flex items-center gap-2">
            Cold Start bonus <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Pre prvých 10 vodičov, ktorí dokončia 5 jázd s pasažiermi:
            <strong className="text-foreground"> 10 € do peňaženky + 0 % komisia na 2 mesiace.</strong>
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 font-medium">
            Zostáva {status.slots_remaining} {status.slots_remaining === 1 ? "miesto" : "miest"} z 10
          </div>
        </div>
      </div>

      {status.activated ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tvoj progres</span>
            <span className="font-medium">{completed} / {required} jázd</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      ) : (
        <Button
          onClick={activate}
          disabled={activating}
          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
        >
          {activating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
          Aktivovať Cold Start bonus
        </Button>
      )}
    </div>
  );
};
