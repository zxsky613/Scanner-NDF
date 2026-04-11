import { supabase } from '../config/supabase';

export async function submitExpenseReview(
  expenseId: string,
  status: 'approved' | 'rejected',
  reviewerId: string,
  rejectionReason?: string
) {
  const { error } = await supabase
    .from('expenses')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq('id', expenseId);

  return { error };
}
