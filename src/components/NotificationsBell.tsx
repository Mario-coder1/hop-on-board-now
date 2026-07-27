import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  is_global: boolean;
  profile_id: string | null;
}

export const NotificationsBell: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readGlobalIds, setReadGlobalIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`profile_id.eq.${profile.id},is_global.eq.true`)
      .order('created_at', { ascending: false })
      .limit(15);

    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('profile_id', profile.id);

    const readIds = new Set(reads?.map(r => r.notification_id) || []);
    setReadGlobalIds(readIds);
    setNotifications((data || []) as Notification[]);
  };

  useEffect(() => {
    if (!profile?.id) return;
    fetchNotifications();

    const channel = supabase
      .channel('nav-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const isUnread = (n: Notification) =>
    n.is_global ? !readGlobalIds.has(n.id) : !n.is_read;

  const unreadCount = notifications.filter(isUnread).length;

  const markAsRead = async (n: Notification) => {
    if (!profile) return;
    if (!isUnread(n)) return;
    if (n.is_global) {
      await supabase
        .from('notification_reads')
        .insert({ notification_id: n.id, profile_id: profile.id });
      setReadGlobalIds(prev => new Set(prev).add(n.id));
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', n.id);
      setNotifications(prev =>
        prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
  };

  const markAllAsRead = async () => {
    for (const n of notifications.filter(isUnread)) {
      await markAsRead(n);
    }
  };

  if (!profile) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifikácie"
          className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary/5 transition-colors"
        >
          <Bell className="w-[18px] h-[18px] text-foreground/80" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="font-semibold text-sm">Notifikácie</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Označiť ako prečítané
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Žiadne notifikácie
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markAsRead(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors ${
                  isUnread(n) ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {isUnread(n) && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {new Date(n.created_at).toLocaleString('sk-SK')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-center text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            Zobraziť všetky v profile
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
