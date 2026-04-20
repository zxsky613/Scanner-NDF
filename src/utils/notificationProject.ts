import type { AppNotification, NotificationType } from '../types';

const PROJECT_NOTIF_TYPES: NotificationType[] = ['project_created', 'project_status_changed'];

export function notificationOpensProjectDetail(n: AppNotification): boolean {
  if (!PROJECT_NOTIF_TYPES.includes(n.type)) return false;
  return getNotificationProjectId(n) != null;
}

export function getNotificationProjectId(n: AppNotification): string | null {
  const m = n.metadata;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const id = (m as Record<string, unknown>).project_id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  return null;
}
