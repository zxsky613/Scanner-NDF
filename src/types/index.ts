/** Rôles proposés à l’inscription et aux métadonnées Supabase. */
export type UserRole = 'employee' | 'sales' | 'finance';

/** Ancien rôle encore présent en base / RLS (non proposé à l’inscription). */
export type LegacyManagerRole = 'manager';

export type StoredUserRole = UserRole | LegacyManagerRole;
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type ExpenseCategory =
  | 'food'
  | 'materials'
  | 'travel'
  | 'lodging'
  | 'equipment_rental'
  | 'local_procurement'
  | 'other';

/** Liste exhaustive des clés catégorie (IA, filtres, compta). */
export const EXPENSE_CATEGORY_KEYS: ExpenseCategory[] = [
  'food',
  'materials',
  'travel',
  'lodging',
  'equipment_rental',
  'local_procurement',
  'other',
];
export type SupportedLanguage = 'fr' | 'en' | 'zh';

export type ProjectCategory =
  | 'sorting_equipment'
  | 'warehouse_equipment'
  | 'low_voltage'
  | 'office_renovation'
  | 'procurement_equipment';

export type ProjectStatus = 'lead' | 'quote' | 'contract' | 'delivery' | 'lost';

export const PROJECT_CATEGORY_KEYS: ProjectCategory[] = [
  'sorting_equipment',
  'warehouse_equipment',
  'low_voltage',
  'office_renovation',
  'procurement_equipment',
];

export const PROJECT_STATUS_KEYS: ProjectStatus[] = [
  'lead',
  'quote',
  'contract',
  'delivery',
  'lost',
];

/** Profil du créateur / personne en charge (jointure Supabase). */
export type ProjectCreator = Pick<Profile, 'id' | 'full_name' | 'email'>;

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  scale: string;
  cycle: string;
  client_contact: string;
  /** Montant devis / contrat (€). */
  contract_amount?: number | null;
  /** Conditions de paiement (saisie Finance). */
  payment_terms?: string | null;
  /** Coûts fixes pour marge (€), saisis Finance. */
  cost_labor?: number | null;
  cost_rent?: number | null;
  cost_materials?: number | null;
  created_by?: string | null;
  /** Alias PostgREST : `creator:profiles!…` */
  creator?: ProjectCreator | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: StoredUserRole;
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
  /** Ville du lieu de dépense (saisie ou IA). */
  city: string;
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
  /** Projet rattaché ; null / absent = dépense « Quotidien ». */
  project_id?: string | null;
  projects?: { id: string; name: string } | null;
  profiles?: Profile;
}

export interface AIExtractionResult {
  date: string;
  supplier: string;
  /** Ville si lisible sur le ticket (adresse, en-tête magasin), sinon chaîne vide. */
  city: string;
  amount_ht: number;
  amount_ttc: number;
  vat_details: VatDetail[];
  confidence: number;
  /** Catégorie déduite du ticket (si le modèle la renvoie). */
  category?: ExpenseCategory;
}

/** Filtre projet : tous | sans projet (quotidien) | id UUID. */
export type ExpenseProjectFilter = 'all' | 'daily' | string;

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  /** Filtre côté API : fournisseur contient cette chaîne (insensible à la casse). */
  supplier_search?: string;
  project_filter?: ExpenseProjectFilter;
}

export type NotificationType =
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'expense_reviewed'
  | 'project_created'
  | 'project_status_changed';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Données structurées pour libellés i18n (remplies par le trigger SQL à jour). */
  metadata?: Record<string, unknown> | null;
  expense_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const CATEGORY_ACCOUNTING_CODES: Record<ExpenseCategory, string> = {
  food: '625100',
  materials: '606300',
  travel: '625600',
  lodging: '625200',
  equipment_rental: '613200',
  local_procurement: '606300',
  other: '628000',
};
