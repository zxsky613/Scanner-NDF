import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { submitExpenseReview } from '../lib/expenseReview';
import { Expense, ExpenseFilters, ExpenseCategory, VatDetail, CATEGORY_ACCOUNTING_CODES } from '../types';
import { FISCAL_ALERT_THRESHOLD } from '../config/constants';

export type FetchExpensesResult = { ok: true; count: number } | { ok: false };

const EXPENSE_SELECT_WITH_PROJECT = '*, projects(id, name)';

function sortExpensesByCreatedAtDesc(a: Expense, b: Expense): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

type ExpenseRow = Expense & { projects?: { id: string; name: string } | null };

/** Erreurs liées au schéma CRM / colonne project (migration pas encore appliquée ou cache PostgREST). */
function looksLikeProjectSchemaError(err: unknown): boolean {
  const raw =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: string }).message)
      : String(err ?? '');
  const m = raw.toLowerCase();
  return (
    m.includes('project_id') ||
    m.includes('projects') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('column') && m.includes('does not exist')
  );
}

export const useExpenses = (userId?: string, isAdmin = false) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  /** Uniquement pour le geste « tirer pour actualiser », pas pour le rechargement au focus. */
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpensesSnapshot = useCallback(
    async (filters?: ExpenseFilters): Promise<Expense[]> => {
      const applyFilters = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        q: any,
        opts: { useProjectFilter: boolean }
      ) => {
        let query = q;
        if (!isAdmin && userId) {
          query = query.eq('user_id', userId);
        }
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.category) {
          query = query.eq('category', filters.category);
        }
        if (filters?.employee_id) {
          query = query.eq('user_id', filters.employee_id);
        }
        if (filters?.date_from) {
          query = query.gte('receipt_date', filters.date_from);
        }
        if (filters?.date_to) {
          query = query.lte('receipt_date', filters.date_to);
        }
        const supplierQ = filters?.supplier_search?.trim();
        if (supplierQ) {
          query = query.ilike('supplier', `%${supplierQ}%`);
        }
        if (opts.useProjectFilter) {
          const pf = filters?.project_filter;
          if (pf && pf !== 'all') {
            if (pf === 'daily') {
              query = query.is('project_id', null);
            } else {
              query = query.eq('project_id', pf);
            }
          }
        }
        return query;
      };

      const run = async (select: string, useProjectFilter: boolean) => {
        let q = supabase.from('expenses').select(select).order('created_at', { ascending: false });
        q = applyFilters(q, { useProjectFilter });
        return q;
      };

      let rows: ExpenseRow[] | null = null;
      let lastErr: unknown = null;

      const attempts: { select: string; useProjectFilter: boolean }[] = [
        { select: EXPENSE_SELECT_WITH_PROJECT, useProjectFilter: true },
        { select: '*', useProjectFilter: true },
        { select: '*', useProjectFilter: false },
      ];

      for (const att of attempts) {
        const query = await run(att.select, att.useProjectFilter);
        const { data, error } = await query;
        if (!error) {
          rows = (data ?? []) as unknown as ExpenseRow[];
          if (att.select !== EXPENSE_SELECT_WITH_PROJECT || !att.useProjectFilter) {
            console.warn(
              '[useExpenses] Chargement des notes en mode compatibilité (sans liaison projet ou sans filtre projet). Vérifiez que la migration Supabase CRM est appliquée pour tout le fonctionnement.'
            );
          }
          break;
        }
        lastErr = error;
        if (!looksLikeProjectSchemaError(error)) {
          throw error;
        }
      }

      if (rows === null) {
        throw lastErr ?? new Error('FETCH_EXPENSES_FAILED');
      }

      const list = rows;
      const ids = [...new Set(list.map(r => r.user_id).filter(Boolean))] as string[];

      const profileById: Record<string, { full_name: string; email: string; id: string }> = {};
      if (ids.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ids);
        if (pErr) throw pErr;
        for (const p of profs ?? []) {
          profileById[p.id] = p;
        }
      }

      return list
        .map(row => {
          const r = row as ExpenseRow & { city?: string | null };
          return {
            ...r,
            city: typeof r.city === 'string' ? r.city : '',
            projects: r.projects ?? null,
            profiles: profileById[row.user_id]
              ? (profileById[row.user_id] as Expense['profiles'])
              : undefined,
          };
        })
        .sort(sortExpensesByCreatedAtDesc);
    },
    [userId, isAdmin]
  );

  const fetchExpenses = useCallback(
    async (filters?: ExpenseFilters, opts?: { pull?: boolean }): Promise<FetchExpensesResult> => {
      const pull = opts?.pull === true;
      if (pull) setRefreshing(true);
      try {
        const merged = await fetchExpensesSnapshot(filters);
        setExpenses(merged);
        return { ok: true, count: merged.length };
      } catch (err) {
        console.error('Fetch expenses error:', err);
        return { ok: false };
      } finally {
        if (pull) setRefreshing(false);
      }
    },
    [fetchExpensesSnapshot]
  );

  const createExpense = async (expense: {
    receipt_date: string;
    supplier: string;
    city: string;
    amount_ht: number;
    amount_ttc: number;
    vat_details: VatDetail[];
    category: ExpenseCategory;
    description?: string;
    receipt_image_url?: string;
    project_id?: string | null;
  }) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const base = {
      receipt_date: expense.receipt_date,
      supplier: expense.supplier,
      city: expense.city,
      amount_ht: expense.amount_ht,
      amount_ttc: expense.amount_ttc,
      vat_details: expense.vat_details,
      category: expense.category,
      description: expense.description,
      receipt_image_url: expense.receipt_image_url,
      user_id: userId,
      accounting_code: CATEGORY_ACCOUNTING_CODES[expense.category],
      is_fiscal_alert: expense.amount_ttc > FISCAL_ALERT_THRESHOLD,
    };

    const tryInsert = async (withProject: boolean, select: string) => {
      const row = withProject
        ? { ...base, project_id: expense.project_id ?? null }
        : base;
      return supabase.from('expenses').insert(row).select(select).single();
    };

    let { data, error } = await tryInsert(true, EXPENSE_SELECT_WITH_PROJECT);
    if (error && looksLikeProjectSchemaError(error)) {
      ({ data, error } = await tryInsert(false, '*'));
    }

    if (!error && data) {
      const r = data as unknown as ExpenseRow;
      setExpenses(prev => [
        {
          ...(r as Expense),
          city: typeof r.city === 'string' ? r.city : '',
          projects: r.projects ?? null,
        },
        ...prev,
      ]);
    }
    return { data, error };
  };

  const checkDuplicate = async (
    date: string,
    supplier: string,
    amountTtc: number,
    excludeExpenseId?: string
  ): Promise<boolean> => {
    let q = supabase
      .from('expenses')
      .select('id')
      .eq('receipt_date', date)
      .ilike('supplier', supplier)
      .eq('amount_ttc', amountTtc)
      .limit(1);
    if (excludeExpenseId) {
      q = q.neq('id', excludeExpenseId);
    }
    const { data } = await q;
    return (data?.length ?? 0) > 0;
  };

  const updateExpenseStatus = async (
    expenseId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
    rejectionReason?: string
  ) => {
    const { error } = await submitExpenseReview(expenseId, status, reviewerId, rejectionReason);

    if (!error) {
      setExpenses(prev =>
        prev.map(e => e.id === expenseId ? { ...e, status, reviewed_by: reviewerId } : e)
      );
    }
    return { error };
  };

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

    if (!error) {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }
    return { error };
  };

  const updateExpense = async (
    expenseId: string,
    expense: {
      receipt_date: string;
      supplier: string;
      city: string;
      amount_ht: number;
      amount_ttc: number;
      vat_details: VatDetail[];
      category: ExpenseCategory;
      description?: string;
      receipt_image_url?: string;
      project_id?: string | null;
    }
  ) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const baseUpdate = {
      receipt_date: expense.receipt_date,
      supplier: expense.supplier,
      city: expense.city,
      amount_ht: expense.amount_ht,
      amount_ttc: expense.amount_ttc,
      vat_details: expense.vat_details,
      category: expense.category,
      description: expense.description,
      receipt_image_url: expense.receipt_image_url,
      accounting_code: CATEGORY_ACCOUNTING_CODES[expense.category],
      is_fiscal_alert: expense.amount_ttc > FISCAL_ALERT_THRESHOLD,
    };

    const tryUpdate = async (withProject: boolean, select: string) => {
      const patch = withProject
        ? { ...baseUpdate, project_id: expense.project_id ?? null }
        : baseUpdate;
      return supabase
        .from('expenses')
        .update(patch)
        .eq('id', expenseId)
        .eq('user_id', userId)
        .select(select)
        .single();
    };

    let { data, error } = await tryUpdate(true, EXPENSE_SELECT_WITH_PROJECT);
    if (error && looksLikeProjectSchemaError(error)) {
      ({ data, error } = await tryUpdate(false, '*'));
    }

    if (!error && data) {
      const row = data as unknown as ExpenseRow;
      setExpenses(prev =>
        prev.map(e =>
          e.id === expenseId
            ? {
                ...(row as Expense),
                city: typeof row.city === 'string' ? row.city : '',
                projects: row.projects ?? null,
                profiles: e.profiles,
              }
            : e
        )
      );
    }
    return { data, error };
  };

  return {
    expenses,
    refreshing,
    fetchExpenses,
    fetchExpensesSnapshot,
    createExpense,
    checkDuplicate,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
  };
};
