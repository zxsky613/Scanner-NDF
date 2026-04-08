import React, { createContext, useContext } from 'react';
import { useNotifications, UseNotificationsResult } from '../hooks/useNotifications';

const NotificationsContext = createContext<UseNotificationsResult | null>(null);

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const value = useNotifications(userId);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): UseNotificationsResult {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
