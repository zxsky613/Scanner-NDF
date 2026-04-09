-- ============================================
-- Supabase SQL Schema for Expense App
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('employee', 'manager', 'finance');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE expense_category AS ENUM ('food', 'materials', 'travel', 'other');

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  department TEXT,
  preferred_language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Employees can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Employees can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Managers/Finance can view all profiles (évite récursion RLS: pas de sous-requête sur profiles)
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "Managers can view all profiles"
  ON profiles FOR SELECT
  USING (public.current_profile_role() IN ('manager', 'finance'));

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Receipt data
  receipt_image_url TEXT,
  receipt_date DATE NOT NULL,
  supplier TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  
  -- Amounts
  amount_ht NUMERIC(10,2) NOT NULL,
  amount_ttc NUMERIC(10,2) NOT NULL,
  
  -- Multi-rate VAT detail stored as JSONB
  -- Example: [{"rate": 5.5, "base": 10.00, "amount": 0.55}, {"rate": 20, "base": 50.00, "amount": 10.00}]
  vat_details JSONB NOT NULL DEFAULT '[]',
  
  -- Category & classification
  category expense_category NOT NULL,
  accounting_code TEXT,
  description TEXT,
  
  -- Status & workflow
  status expense_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Duplicate detection hash (based on date + supplier + amount_ttc)
  duplicate_hash TEXT,
  is_flagged_duplicate BOOLEAN DEFAULT FALSE,
  
  -- Fiscal alert
  is_fiscal_alert BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Employees can view their own expenses
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

-- Employees can insert their own expenses
CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Employees can update their own pending expenses
CREATE POLICY "Users can update own pending expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Employees can delete their own pending expenses
CREATE POLICY "Users can delete own pending expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Managers/Finance can view all expenses
CREATE POLICY "Managers can view all expenses"
  ON expenses FOR SELECT
  USING (public.current_profile_role() IN ('manager', 'finance'));

-- Managers/Finance can update expense status
CREATE POLICY "Managers can update expenses"
  ON expenses FOR UPDATE
  USING (public.current_profile_role() IN ('manager', 'finance'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_receipt_date ON expenses(receipt_date);
CREATE INDEX idx_expenses_duplicate_hash ON expenses(duplicate_hash);
CREATE INDEX idx_expenses_category ON expenses(category);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
-- search_path + qualification requises par Supabase (sinon: "Database error saving new user")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role public.user_role;
BEGIN
  BEGIN
    new_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'employee'::public.user_role
    );
  EXCEPTION
    WHEN OTHERS THEN
      new_role := 'employee'::public.user_role;
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.email), ''),
      'Utilisateur'
    ),
    new_role
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-compute duplicate hash and fiscal alert
CREATE OR REPLACE FUNCTION compute_expense_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duplicate_hash = MD5(
    COALESCE(NEW.receipt_date::TEXT, '') ||
    LOWER(COALESCE(NEW.supplier, '')) ||
    COALESCE(NEW.amount_ttc::TEXT, '')
  );
  NEW.is_fiscal_alert = (NEW.amount_ttc > 150);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expense_metadata
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION compute_expense_metadata();

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Dashboard > Storage : créer le bucket "receipts" (public: désactivé).
-- Puis exécuter supabase/storage_receipts_rls.sql (upload dossier utilisateur + lecture finance/manager).

-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
