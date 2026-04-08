import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';
import { Expense, ExpenseFilters, ExpenseCategory, VatDetail, CATEGORY_ACCOUNTING_CODES } from '../types';
import { FISCAL_ALERT_THRESHOLD } from '../config/constants';

export const useExpenses = (userId?: string, isAdmin = false) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    setLoading(true);
    try {
      /* Pas d’embed expenses→profiles (deux FK → PGRST201). Deux requêtes + fusion. */
      let query = supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

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

      const { data: rows, error } = await query;
      if (error) throw error;
      const list = rows ?? [];
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

      const merged: Expense[] = list.map(row => ({
        ...row,
        profiles: profileById[row.user_id]
          ? (profileById[row.user_id] as Expense['profiles'])
          : undefined,
      }));
      setExpenses(merged);
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin]);

  const createExpense = async (expense: {
    receipt_date: string;
    supplier: string;
    amount_ht: number;
    amount_ttc: number;
    vat_details: VatDetail[];
    category: ExpenseCategory;
    description?: string;
    receipt_image_url?: string;
  }) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase.from('expenses').insert({
      ...expense,
      user_id: userId,
      accounting_code: CATEGORY_ACCOUNTING_CODES[expense.category],
      is_fiscal_alert: expense.amount_ttc > FISCAL_ALERT_THRESHOLD,
    }).select().single();

    if (!error) {
      setExpenses(prev => [data as Expense, ...prev]);
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
    const { error } = await supabase
      .from('expenses')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq('id', expenseId);

    if (!error) {
      setExpenses(prev =>
        prev.map(e => e.id === expenseId ? { ...e, status, reviewed_by: reviewerId } : e)
      );
    }
    return { error };
  };

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

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
      amount_ht: number;
      amount_ttc: number;
      vat_details: VatDetail[];
      category: ExpenseCategory;
      description?: string;
      receipt_image_url?: string;
    }
  ) => {
    if (!userId) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('expenses')
      .update({
        receipt_date: expense.receipt_date,
        supplier: expense.supplier,
        amount_ht: expense.amount_ht,
        amount_ttc: expense.amount_ttc,
        vat_details: expense.vat_details,
        category: expense.category,
        description: expense.description,
        receipt_image_url: expense.receipt_image_url,
        accounting_code: CATEGORY_ACCOUNTING_CODES[expense.category],
        is_fiscal_alert: expense.amount_ttc > FISCAL_ALERT_THRESHOLD,
      })
      .eq('id', expenseId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setExpenses(prev =>
        prev.map(e =>
          e.id === expenseId ? { ...(data as Expense), profiles: e.profiles } : e
        )
      );
    }
    return { data, error };
  };

  return {
    expenses,
    loading,
    fetchExpenses,
    createExpense,
    checkDuplicate,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
  };
};
