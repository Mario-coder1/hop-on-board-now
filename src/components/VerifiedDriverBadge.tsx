import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function VerifiedDriverBadge({ profileId }: { profileId?: string | null }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!profileId) return;
    supabase.rpc('is_driver_verified', { _profile_id: profileId }).then(({ data }) => setOk(!!data));
  }, [profileId]);
  if (!ok) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 ml-2 align-middle">
      <BadgeCheck className="w-3.5 h-3.5" /> Overený vodič
    </span>
  );
}
