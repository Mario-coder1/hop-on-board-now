import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/legalVersions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Shows a mandatory dialog when the logged-in user has not accepted the current
 * version of Terms of Service or Privacy/GDPR. On accept we persist versions
 * and timestamps to the profile — audit trail of consent.
 */
export function LegalUpdateDialog() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const p = profile as any;
  const needsAccept =
    !!profile &&
    (p.terms_version !== TERMS_VERSION || p.privacy_version !== PRIVACY_VERSION);

  useEffect(() => {
    setOpen(!!needsAccept);
  }, [needsAccept]);

  const handleAccept = async () => {
    if (!profile) return;
    setSaving(true);
    const acceptedAt = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        terms_version: TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        privacy_version: PRIVACY_VERSION,
        privacy_accepted_at: acceptedAt,
      } as any)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Ďakujeme", description: "Súhlas s aktualizovanými podmienkami bol uložený." });
    setOpen(false);
  };

  if (!needsAccept) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* mandatory */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>Aktualizované právne dokumenty</DialogTitle>
          <DialogDescription>
            Aktualizovali sme naše{" "}
            <Link to="/terms" target="_blank" className="underline text-primary">
              Obchodné podmienky
            </Link>{" "}
            a{" "}
            <Link to="/gdpr" target="_blank" className="underline text-primary">
              Ochranu osobných údajov (GDPR)
            </Link>
            . Pre pokračovanie potvrď, že si sa s nimi oboznámil a súhlasíš s nimi.
          </DialogDescription>
        </DialogHeader>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Verzia VOP: <span className="font-mono">{TERMS_VERSION}</span></div>
          <div>Verzia GDPR: <span className="font-mono">{PRIVACY_VERSION}</span></div>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={saving} className="w-full">
            {saving ? "Ukladám..." : "Súhlasím a pokračovať"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
