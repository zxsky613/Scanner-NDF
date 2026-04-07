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
      let query = supabase
        .from('expenses')
        .select('*, profiles(full_name, email)')
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

      const { data, error } = await query;
      if (error) throw error;
      setExpenses((data as Expense[]) ?? []);
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

  const checkDuplicate = async (date: string, supplier: string, amountTtc: number): Promise<boolean> => {
    const { data } = await supabase
      .from('expenses')
      .select('id')
      .eq('receipt_date', date)
      .ilike('supplier', supplier)
      .eq('amount_ttc', amountTtc)
      .limit(1);
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

  return {
    expenses,
    loading,
    fetchExpenses,
    createExpense,
    checkDuplicate,
    updateExpenseStatus,
    deleteExpense,
  };
};
