import { useEffect, useState } from 'react';
import { Gift, Copy, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function InviteFriendCard() {
  const { toast } = useToast();
  const [data, setData] = useState<{ free_credits: number; referral_code?: string; invited_count?: number } | null>(null);

  useEffect(() => {
    supabase.rpc('my_booking_credits').then(({ data }) => setData(data as any));
  }, []);

  if (!data?.referral_code) return null;
  const link = `https://takeme.sk/auth?ref=${data.referral_code}`;
  const text = `Pridaj sa na TakeMe.sk – spolujazda po Slovensku. Prvá rezervácia je zdarma: ${link}`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'TakeMe', text, url: link }); } catch { /* zrušené */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Odkaz skopírovaný' });
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><Gift className="w-5 h-5 text-primary" /> Pozvi kamaráta</div>
        <p className="text-sm text-muted-foreground">
          Kamarát má prvú rezerváciu zdarma. Keď absolvuje prvú jazdu, aj ty dostaneš jednu rezerváciu zdarma.
        </p>
        <div className="text-sm">
          Bezplatné rezervácie: <b>{data.free_credits}</b> · Pozvaní: <b>{data.invited_count ?? 0}</b>
        </div>
        <div className="flex gap-2">
          <Button onClick={share} className="flex-1"><Share2 className="w-4 h-4 mr-2" />Zdieľať odkaz</Button>
          <Button variant="outline" size="icon" aria-label="Kopírovať odkaz"
            onClick={async () => { await navigator.clipboard.writeText(link); toast({ title: 'Odkaz skopírovaný' }); }}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
