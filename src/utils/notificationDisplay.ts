import type { TFunction } from 'i18next';
import type { AppNotification } from '../types';
import { formatCurrency } from './dateFormat';

function metaRecord(n: AppNotification): Record<string, unknown> | null {
  const m = n.metadata;
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    return m as Record<string, unknown>;
  }
  return null;
}

const str = (meta: Record<string, unknown>, k: string) =>
  meta[k] != null && String(meta[k]).trim() !== '' ? String(meta[k]).trim() : '';

const num = (meta: Record<string, unknown>, k: string): number | null => {
  const v = meta[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const p = parseFloat(v);
    return Number.isFinite(p) ? p : null;
  }
  return null;
};

/**
 * Titres / corps selon la langue i18n active. Si `metadata` est absent (anciennes lignes), retourne title/body SQL.
 */
export function getLocalizedNotification(n: AppNotification, t: TFunction): { title: string; body: string } {
  const meta = metaRecord(n);
  if (!meta || Object.keys(meta).length === 0) {
    return { title: n.title, body: n.body ?? '' };
  }

  switch (n.type) {
    case 'expense_created': {
      const supplier = str(meta, 'supplier');
      const amount = num(meta, 'amount_ttc');
      const employee = str(meta, 'employee_name') || t('notifications.fallbackEmployee');
      if (supplier && amount !== null) {
        return {
          title: t('notifications.types.expense_created.title'),
          body: t('notifications.types.expense_created.body', {
            employee,
            supplier,
            amount: formatCurrency(amount),
          }),
        };
      }
      break;
    }
    case 'expense_deleted': {
      const supplier = str(meta, 'supplier');
      if (supplier) {
        return {
          title: t('notifications.types.expense_deleted.title'),
          body: t('notifications.types.expense_deleted.body', { supplier }),
        };
      }
      break;
    }
    case 'expense_reviewed': {
      const supplier = str(meta, 'supplier');
      const status = str(meta, 'review_status');
      if (supplier && (status === 'approved' || status === 'rejected')) {
        if (status === 'approved') {
          return {
            title: t('notifications.types.expense_reviewed.titleApproved'),
            body: t('notifications.types.expense_reviewed.bodyApproved', { supplier }),
          };
        }
        return {
          title: t('notifications.types.expense_reviewed.titleRejected'),
          body: t('notifications.types.expense_reviewed.bodyRejected', { supplier }),
        };
      }
      break;
    }
    case 'expense_updated': {
      const supplier = str(meta, 'supplier');
      const employee = str(meta, 'employee_name') || t('notifications.fallbackEmployee');
      if (supplier) {
        return {
          title: t('notifications.types.expense_updated.title'),
          body: t('notifications.types.expense_updated.body', { employee, supplier }),
        };
      }
      break;
    }
    default:
      break;
  }

  return { title: n.title, body: n.body ?? '' };
}
