import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { AppNotification } from '../types';

const POLL_MS = 25_000;

/** PostgREST : table absente du cache (script SQL pas encore exécuté sur le projet). */
function isNotificationsTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' && String(error.message).includes('notifications')) return true;
  if (String(error.message).includes("Could not find the table 'public.notifications'")) return true;
  return false;
}

export interface UseNotificationsResult {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        if (isNotificationsTableMissing(error)) {
          setNotifications([]);
          return;
        }
        throw error;
      }
      setNotifications((data ?? []) as AppNotification[]);
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        isNotificationsTableMissing(e as { code?: string; message?: string })
      ) {
        setNotifications([]);
      } else if (__DEV__) {
        console.warn('notifications fetch:', e);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [userId, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      const now = new Date().toISOString();
      const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', id);
      if (error && isNotificationsTableMissing(error)) return;
      if (!error) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read_at: now } : n))
        );
      }
    },
    [userId]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error && isNotificationsTableMissing(error)) return;
    if (!error) {
      setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })));
    }
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return {
    notifications,
    loading,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  };
}
