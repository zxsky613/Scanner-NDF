import type { AppNotification } from '../types';

/** Notification non consultée (`read_at` vide). Après ouverture, `markRead` place la ligne en « déjà lues ». */
export function notificationNeedsAttention(n: AppNotification): boolean {
  return !n.read_at;
}
