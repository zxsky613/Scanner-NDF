export type UserRole = 'employee' | 'manager' | 'finance';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type ExpenseCategory = 'food' | 'materials' | 'travel' | 'other';
export type SupportedLanguage = 'fr' | 'en' | 'zh';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  preferred_language: SupportedLanguage;
  created_at: string;
  updated_at: string;
}

export interface VatDetail {
  rate: number;
  base: number;
  amount: number;
}

export interface Expense {
  id: string;
  user_id: string;
  receipt_image_url?: string;
  receipt_date: string;
  supplier: string;
  amount_ht: number;
  amount_ttc: number;
  vat_details: VatDetail[];
  category: ExpenseCategory;
  accounting_code?: string;
  description?: string;
  status: ExpenseStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  duplicate_hash?: string;
  is_flagged_duplicate: boolean;
  is_fiscal_alert: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface AIExtractionResult {
  date: string;
  supplier: string;
  amount_ht: number;
  amount_ttc: number;
  vat_details: VatDetail[];
  confidence: number;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
}

export type NotificationType =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'expense_reviewed';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  expense_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const CATEGORY_ACCOUNTING_CODES: Record<ExpenseCategory, string> = {
  food: '625100',
  materials: '606300',
  travel: '625600',
  other: '628000',
};
