import type { AppNotification, ExpenseStatus } from '../types';

/** Alertes destinées aux validateurs (nouvelle ou note modifiée encore en attente). */
export function isReviewerExpenseQueueType(type: AppNotification['type']): boolean {
  return type === 'expense_created' || type === 'expense_updated';
}

/**
 * Alerte « à traiter » (section non traitées) :
 * - Finance / manager : création ou mise à jour de note tant que la dépense est encore `pending`
 *   (ignoré : marqué lu sans avoir approuvé/refusé).
 * - Sinon : non lue (`read_at` vide).
 */
export function notificationNeedsAttention(
  n: AppNotification,
  expenseStatusById: Record<string, ExpenseStatus>,
  viewerIsReviewer: boolean
): boolean {
  if (viewerIsReviewer && isReviewerExpenseQueueType(n.type) && n.expense_id) {
    return expenseStatusById[n.expense_id] === 'pending';
  }
  return !n.read_at;
}
