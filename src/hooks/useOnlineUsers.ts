import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineUserEntry {
  profileId: string | null;
  onlineAt: string;
}

export const useOnlineUsers = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserEntry[]>([]);
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
        const state = channel.presenceState() as Record<string, Array<{ online_at?: string; user_id?: string | null }>>;
        const keys = Object.keys(state);
        setOnlineCount(keys.length);
        const list: OnlineUserEntry[] = keys.map((k) => {
          const meta = state[k]?.[0] || {};
          return {
            profileId: (meta.user_id as string | null) ?? (k.startsWith('anonymous-') ? null : k),
            onlineAt: meta.online_at || new Date().toISOString(),
          };
        });
        setOnlineUsers(list);
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

  return Object.assign(onlineCount, {}) as number & never extends never ? number : never;
};

export const useOnlineUsersDetailed = () => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserEntry[]>([]);
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
        const state = channel.presenceState() as Record<string, Array<{ online_at?: string; user_id?: string | null }>>;
        const keys = Object.keys(state);
        const list: OnlineUserEntry[] = keys.map((k) => {
          const meta = state[k]?.[0] || {};
          return {
            profileId: (meta.user_id as string | null) ?? (k.startsWith('anonymous-') ? null : k),
            onlineAt: meta.online_at || new Date().toISOString(),
          };
        });
        setOnlineUsers(list);
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

  return { onlineCount: onlineUsers.length, onlineUsers };
};
