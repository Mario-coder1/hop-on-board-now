import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

const PLACEHOLDER_NAMES = new Set(["user", "User", "USER"]);

const RequireFullNameDialog: React.FC = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const needsName =
    !!user &&
    !!profile &&
    (!profile.full_name || PLACEHOLDER_NAMES.has(profile.full_name.trim()));

  useEffect(() => {
    if (needsName) setName("");
  }, [needsName]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Zadajte vaše skutočné meno (min. 2 znaky).");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Meno môže mať max. 100 znakov.");
      return;
    }
    setSaving(true);
    const clean = trimmed.replace(/[\x00-\x1F\x7F]/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: clean })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error("Nepodarilo sa uložiť meno", { description: error.message });
      return;
    }
    toast.success("Meno uložené");
    await refreshProfile();
  };

  return (
    <Dialog open={needsName}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Doplňte svoje meno</DialogTitle>
          <DialogDescription>
            Pre používanie aplikácie potrebujeme vaše skutočné meno a priezvisko. Bude viditeľné pre vodičov a spolujazdcov.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="require-name">Celé meno</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="require-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ján Novák"
                className="pl-11 h-12"
                maxLength={100}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" variant="hero" className="w-full" disabled={saving}>
              {saving ? "Ukladám..." : "Uložiť meno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RequireFullNameDialog;
