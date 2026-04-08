-- ============================================
-- Notifications (à exécuter dans le SQL Editor Supabase)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pas de policy INSERT : uniquement via trigger SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.notify_on_expense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO emp_name FROM profiles WHERE id = NEW.user_id;
    INSERT INTO notifications (user_id, type, title, body, expense_id)
    SELECT
      p.id,
      'expense_created',
      'Nouvelle note de frais',
      COALESCE(emp_name, 'Employé') || ' — ' || NEW.supplier
        || ' · ' || TRIM(TO_CHAR(NEW.amount_ttc, 'FM999999990.00')) || ' € TTC',
      NEW.id
    FROM profiles p
    WHERE p.role IN ('manager', 'finance');
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, type, title, body, expense_id)
    SELECT
      p.id,
      'expense_deleted',
      'Note supprimée',
      'Une note en attente a été supprimée : ' || OLD.supplier || '.',
      NULL
    FROM profiles p
    WHERE p.role IN ('manager', 'finance');
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Employé : note traitée
    IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
      INSERT INTO notifications (user_id, type, title, body, expense_id)
      VALUES (
        NEW.user_id,
        'expense_reviewed',
        CASE WHEN NEW.status = 'approved' THEN 'Note approuvée' ELSE 'Note rejetée' END,
        '« ' || NEW.supplier || ' » — ' ||
          CASE WHEN NEW.status = 'approved'
            THEN 'votre note a été approuvée.'
            ELSE 'votre note a été rejetée.'
          END,
        NEW.id
      );
    END IF;

    -- Manager / finance : note modifiée par l’employé (toujours en attente)
    IF NEW.status = 'pending' AND (
         OLD.supplier IS DISTINCT FROM NEW.supplier
      OR OLD.amount_ht IS DISTINCT FROM NEW.amount_ht
      OR OLD.amount_ttc IS DISTINCT FROM NEW.amount_ttc
      OR OLD.receipt_date IS DISTINCT FROM NEW.receipt_date
      OR OLD.category IS DISTINCT FROM NEW.category
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.vat_details IS DISTINCT FROM NEW.vat_details
    ) THEN
      SELECT full_name INTO emp_name FROM profiles WHERE id = NEW.user_id;
      INSERT INTO notifications (user_id, type, title, body, expense_id)
      SELECT
        p.id,
        'expense_updated',
        'Note modifiée',
        COALESCE(emp_name, 'Employé') || ' a mis à jour : ' || NEW.supplier || '.',
        NEW.id
      FROM profiles p
      WHERE p.role IN ('manager', 'finance');
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_expenses_notify ON expenses;
CREATE TRIGGER trigger_expenses_notify
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_expense_change();
