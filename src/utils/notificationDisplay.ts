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
 * Complète les champs manquants à partir du title/body français issus du trigger SQL,
 * pour que les clés i18n (ex. zh) s’appliquent même si metadata est vide ou ancien.
 * Les noms fournisseurs restent tels qu’extraits du texte (pas de traduction).
 */
function enrichMetadataFromStoredText(
  n: AppNotification,
  base: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  const body = (n.body ?? '').trim();
  const title = (n.title ?? '').trim();

  switch (n.type) {
    case 'expense_created': {
      const missingAmount = num(out, 'amount_ttc') === null;
      const missingSupplier = !str(out, 'supplier');
      if ((missingAmount || missingSupplier || !str(out, 'employee_name')) && body) {
        /* Corps SQL : « Nom — Fournisseur · 35.90 € TTC » (point décimal dans TO_CHAR). */
        const m = body.match(
          /^(.+?)\s*[—–\-−]\s*(.+?)\s*[·•]\s*([\d\s\u00A0]+(?:[.,]\d+)?)\s*€(?:\s*TTC)?/i
        );
        if (m) {
          if (!str(out, 'employee_name')) out.employee_name = m[1].trim();
          if (!str(out, 'supplier')) out.supplier = m[2].trim();
          if (missingAmount) {
            const normalized = m[3].replace(/[\s\u00A0]/g, '').replace(',', '.');
            const amt = parseFloat(normalized);
            if (Number.isFinite(amt)) out.amount_ttc = amt;
          }
        }
      }
      break;
    }
    case 'expense_reviewed': {
      if (!str(out, 'supplier') && body) {
        const m = body.match(/«\s*([^»]+?)\s*»/);
        if (m) out.supplier = m[1].trim();
      }
      const st = str(out, 'review_status').toLowerCase();
      if (st === 'approved' || st === 'rejected') {
        out.review_status = st;
      } else {
        const tl = `${title}\n${body}`.toLowerCase();
        if (tl.includes('rejet') || tl.includes('reject') || tl.includes('拒绝')) {
          out.review_status = 'rejected';
        } else if (
          tl.includes('approuv') ||
          tl.includes('approv') ||
          tl.includes('批准')
        ) {
          out.review_status = 'approved';
        }
      }
      break;
    }
    case 'expense_deleted': {
      if (!str(out, 'supplier') && body) {
        const m = body.match(/supprimée\s*:\s*(.+?)\s*\.(?:\s*)?$/i);
        if (m) out.supplier = m[1].trim();
      }
      break;
    }
    case 'expense_updated': {
      if ((!str(out, 'supplier') || !str(out, 'employee_name')) && body) {
        const m = body.match(/^(.+?)\s+a mis à jour\s*:\s*(.+)$/i);
        if (m) {
          if (!str(out, 'employee_name')) out.employee_name = m[1].trim();
          if (!str(out, 'supplier')) {
            out.supplier = m[2].replace(/\.\s*$/, '').trim();
          }
        }
      }
      break;
    }
    case 'project_created': {
      if ((!str(out, 'project_name') || !str(out, 'creator_name')) && body) {
        const m = body.match(/^(.+?)\s*[—–\-−]\s*(.+)$/);
        if (m) {
          if (!str(out, 'creator_name')) out.creator_name = m[1].trim();
          if (!str(out, 'project_name')) out.project_name = m[2].trim();
        }
      }
      break;
    }
    case 'project_status_changed': {
      if ((!str(out, 'old_status') || !str(out, 'new_status')) && body) {
        const m = body.match(/:\s*(\S+)\s*→\s*(\S+)\s*$/);
        if (m) {
          if (!str(out, 'old_status')) out.old_status = m[1].trim();
          if (!str(out, 'new_status')) out.new_status = m[2].trim();
        }
      }
      break;
    }
    default:
      break;
  }
  return out;
}

/**
 * Titres / corps selon la langue i18n active. Le fournisseur et les montants
 * conservent les valeurs métier ; seuls les libellés passent par i18n.
 */
export function getLocalizedNotification(n: AppNotification, t: TFunction): { title: string; body: string } {
  const raw = metaRecord(n);
  const meta = enrichMetadataFromStoredText(n, raw ? { ...raw } : {});

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
      const status = str(meta, 'review_status').toLowerCase();
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
    case 'project_created': {
      const project = str(meta, 'project_name');
      const creator = str(meta, 'creator_name') || t('notifications.fallbackProjectCreator');
      if (project) {
        return {
          title: t('notifications.types.project_created.title'),
          body: t('notifications.types.project_created.body', { creator, project }),
        };
      }
      break;
    }
    case 'project_status_changed': {
      const project = str(meta, 'project_name');
      const oldS = str(meta, 'old_status');
      const newS = str(meta, 'new_status');
      if (project && oldS && newS) {
        const oldLabel = t(`crm.statuses.${oldS}`, { defaultValue: oldS });
        const newLabel = t(`crm.statuses.${newS}`, { defaultValue: newS });
        return {
          title: t('notifications.types.project_status_changed.title'),
          body: t('notifications.types.project_status_changed.body', {
            project,
            oldStatus: oldLabel,
            newStatus: newLabel,
          }),
        };
      }
      break;
    }
    default:
      break;
  }

  return { title: n.title, body: n.body ?? '' };
}
