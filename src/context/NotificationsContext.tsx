import React, { createContext, useContext } from 'react';
import { useNotifications, UseNotificationsResult } from '../hooks/useNotifications';

const NotificationsContext = createContext<UseNotificationsResult | null>(null);

export function NotificationsProvider({
  userId,
  viewerIsReviewer = false,
  children,
}: {
  userId: string;
  /** Compte finance ou manager : alertes nouvelle/modif. note tant que la dépense est en attente. */
  viewerIsReviewer?: boolean;
  children: React.ReactNode;
}) {
  const value = useNotifications(userId, { viewerIsReviewer });
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): UseNotificationsResult {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
