import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import type { AppNotification, ExpenseStatus } from '../types';
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
  /** Statuts courants des dépenses liées (pour file d’attente validateur). */
  expenseStatusById: Record<string, ExpenseStatus>;
  /** Profil finance ou manager : règles « non traité » basées sur le statut de la note. */
  viewerIsReviewer: boolean;
  /** Premier chargement (liste vide, écran plein). */
  loading: boolean;
  /** Tirer pour actualiser uniquement — ne pas lier au focus / polling. */
  refreshing: boolean;
  /** Nombre d’alertes « à traiter » (non traitées), dont notes pending pour les validateurs. */
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Mise à jour en arrière-plan (onglet actif, polling) : pas d’indicateur. */
  syncInBackground: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(
  userId: string | undefined,
  options?: { viewerIsReviewer?: boolean }
): UseNotificationsResult {
  const viewerIsReviewer = options?.viewerIsReviewer === true;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expenseStatusById, setExpenseStatusById] = useState<Record<string, ExpenseStatus>>({});
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
          setExpenseStatusById({});
          return;
        }
        throw error;
      }
      const notifs = (data ?? []) as AppNotification[];
      const ids = [
        ...new Set(
          notifs
            .filter(
              n =>
                n.expense_id &&
                (n.type === 'expense_created' || n.type === 'expense_updated')
            )
            .map(n => n.expense_id as string)
        ),
      ];
      let statusMap: Record<string, ExpenseStatus> = {};
      if (ids.length > 0) {
        const { data: rows, error: errRows } = await supabase
          .from('expenses')
          .select('id, status')
          .in('id', ids);
        if (!errRows && rows) {
          for (const r of rows) {
            statusMap[r.id] = r.status as ExpenseStatus;
          }
        }
      }
      setExpenseStatusById(statusMap);
      setNotifications(notifs);
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        isNotificationsTableMissing(e as { code?: string; message?: string })
      ) {
        setNotifications([]);
        setExpenseStatusById({});
      } else if (__DEV__) {
        console.warn('notifications fetch:', e);
      }
    }
  }, [userId]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(n =>
        notificationNeedsAttention(n, expenseStatusById, viewerIsReviewer)
      ).length,
    [notifications, expenseStatusById, viewerIsReviewer]
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

  return {
    notifications,
    expenseStatusById,
    viewerIsReviewer,
    loading,
    refreshing,
    unreadCount,
    refresh,
    syncInBackground,
    markRead,
    markAllRead,
  };
}
