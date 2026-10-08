import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SpokenLanguagesPicker from "./SpokenLanguagesPicker";
import { detectSpokenLanguages } from "@/lib/spokenLanguages";

/** Profile field: languages the user speaks with passengers. Saves on every change. */
const SpokenLanguagesField = ({ profileId }: { profileId?: string }) => {
  const [langs, setLangs] = useState<string[] | null>(null);

  useEffect(() => {
    if (!profileId) return;
    supabase.from("profiles").select("spoken_languages").eq("id", profileId).maybeSingle().then(({ data }) => {
      const v = (data as any)?.spoken_languages as string[] | undefined;
      setLangs(v && v.length ? v : detectSpokenLanguages());
    });
  }, [profileId]);

  const save = async (v: string[]) => {
    setLangs(v);
    if (!profileId) return;
    const { error } = await supabase.from("profiles").update({ spoken_languages: v } as any).eq("id", profileId);
    if (error) toast.error("Jazyky sa nepodarilo uložiť");
  };

  if (!langs) return null;
  return (
    <div>
      <Label>Akými jazykmi komunikuješ s cestujúcimi?</Label>
      <div className="mt-2"><SpokenLanguagesPicker value={langs} onChange={save} /></div>
    </div>
  );
};

export default SpokenLanguagesField;
