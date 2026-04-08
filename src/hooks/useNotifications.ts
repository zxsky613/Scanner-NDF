import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { AppNotification } from '../types';

const POLL_MS = 25_000;

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
      if (error) throw error;
      setNotifications((data ?? []) as AppNotification[]);
    } catch (e) {
      console.error('notifications fetch:', e);
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
