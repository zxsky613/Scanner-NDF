import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import type { AppNotification } from '../types';
import { notificationNeedsAttention } from '../utils/notificationAttention';

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
  /** Premier chargement (liste vide, écran plein). */
  loading: boolean;
  /** Tirer pour actualiser uniquement — ne pas lier au focus / polling. */
  refreshing: boolean;
  /** Notifications non lues (`read_at` vide). */
  unreadCount: number;
  /**
   * Nombre de notes en attente de validation (finance / manager), pour le badge onglet Suivi.
   * 0 si l’utilisateur n’est pas validateur.
   */
  pendingExpenseCount: number;
  refresh: () => Promise<void>;
  /** Mise à jour en arrière-plan (onglet actif, polling) : pas d’indicateur. */
  syncInBackground: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export function useNotifications(
  userId: string | undefined,
  options?: { viewerIsReviewer?: boolean }
): UseNotificationsResult {
  const viewerIsReviewer = options?.viewerIsReviewer === true;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingExpenseCount, setPendingExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    if (!userId) return;
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
          setPendingExpenseCount(0);
          return;
        }
        throw error;
      }
      setNotifications((data ?? []) as AppNotification[]);

      if (viewerIsReviewer) {
        const { count, error: countErr } = await supabase
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (countErr) {
          if (__DEV__) console.warn('pending expense count:', countErr);
          setPendingExpenseCount(0);
        } else {
          setPendingExpenseCount(count ?? 0);
        }
      } else {
        setPendingExpenseCount(0);
      }
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        isNotificationsTableMissing(e as { code?: string; message?: string })
      ) {
        setNotifications([]);
        setPendingExpenseCount(0);
      } else if (__DEV__) {
        console.warn('notifications fetch:', e);
      }
    }
  }, [userId, viewerIsReviewer]);

  const unreadCount = useMemo(
    () => notifications.filter(n => notificationNeedsAttention(n)).length,
    [notifications]
  );

  const syncInBackground = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      await fetchNotifications();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const t = setInterval(() => {
      void syncInBackground();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [userId, syncInBackground]);

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      const now = new Date().toISOString();
      setNotifications(p => p.map(n => (n.id === id ? { ...n, read_at: now } : n)));

      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id');

      if (error && isNotificationsTableMissing(error)) {
        await fetchNotifications();
        return;
      }
      if (error || !data?.length) {
        if (!error && __DEV__) {
          console.warn('[markRead] aucune ligne mise à jour pour la notification', id);
        }
        await fetchNotifications();
      }
    },
    [userId, fetchNotifications]
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

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId);
      if (error && isNotificationsTableMissing(error)) return;
      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    },
    [userId]
  );

  return {
    notifications,
    loading,
    refreshing,
    unreadCount,
    pendingExpenseCount,
    refresh,
    syncInBackground,
    markRead,
    markAllRead,
    deleteNotification,
  };
}
