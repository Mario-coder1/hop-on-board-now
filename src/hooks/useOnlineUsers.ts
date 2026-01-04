import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnlineUsers = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: profile?.id || 'anonymous-' + Math.random().toString(36).slice(2),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
            user_id: profile?.id || null,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return onlineCount;
};
